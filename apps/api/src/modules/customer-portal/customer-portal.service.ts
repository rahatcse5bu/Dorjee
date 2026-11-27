import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import * as bcrypt from "bcryptjs";
import { isValidObjectId, Model } from "mongoose";
import { hashInviteCode, normalizePhone } from "../common/customer-app";
import { CustomerLimitsService } from "../customers/customer-limits.service";
import { Customer, CustomerDocument } from "../customers/schemas/customer.schema";
import { OrdersService } from "../orders/orders.service";
import { Order, OrderDocument } from "../orders/schemas/order.schema";
import { Shop, ShopDocument } from "../shops/schemas/shop.schema";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { CUSTOMER_TOKEN_TTL, customerTokenSecret, SignedInCustomer } from "./customer-auth.guard";
import { CustomerJoinDto, CustomerLoginDto, PlaceCustomerOrderDto } from "./dto/portal.dto";
import { CustomerAccount, CustomerAccountDocument } from "./schemas/customer-account.schema";

type Measurements = Record<string, string | number | boolean>;

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
/** Requests waiting for the shop to confirm, per customer per shop. */
const MAX_PENDING_REQUESTS = 3;
// Compared against when the phone has no account, so both paths take as long.
const DUMMY_HASH = bcrypt.hashSync("dorjee-no-account", 10);

export type OrderingBlock = "shop_unavailable" | "no_previous_order" | "no_measurements" | "too_many_pending";

const BLOCK_MESSAGES: Record<OrderingBlock, string> = {
  shop_unavailable: "This shop isn't taking orders through the app right now.",
  no_previous_order: "Your first order at this shop has to be placed in person, so the shop can take your measurements.",
  no_measurements: "The shop has no saved measurements for you yet. Visit the shop to get measured.",
  too_many_pending: "You already have orders waiting for this shop to confirm. Please wait for the shop to confirm them.",
};

export interface Garment {
  clothType: string;
  /** Price of the last one ordered; the shop confirms the final price. */
  lastPrice: number;
  measurements: Measurements;
}

const nonEmpty = (m?: Measurements | null) => !!m && Object.keys(m).length > 0;

@Injectable()
export class CustomerPortalService {
  constructor(
    @InjectModel(CustomerAccount.name) private readonly accountModel: Model<CustomerAccountDocument>,
    @InjectModel(Customer.name) private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Shop.name) private readonly shopModel: Model<ShopDocument>,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly ordersService: OrdersService,
    private readonly jwtService: JwtService,
    private readonly limits: CustomerLimitsService,
  ) {}

  // ---------------------------------------------------------------- auth

  private issue(account: { _id: unknown; phone: string; name: string }) {
    const accessToken = this.jwtService.sign(
      { sub: String(account._id), kind: "customer" },
      { secret: customerTokenSecret(), expiresIn: CUSTOMER_TOKEN_TTL },
    );
    return { accessToken, customer: { _id: String(account._id), phone: account.phone, name: account.name } };
  }

  /** Checks a password with a lock after repeated failures. Throws on a wrong password. */
  private async verifyPassword(account: CustomerAccountDocument, password: string) {
    if (account.lockedUntil && account.lockedUntil.getTime() > Date.now()) {
      const minutes = Math.ceil((account.lockedUntil.getTime() - Date.now()) / 60_000);
      throw new HttpException(
        `Too many wrong passwords. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (await bcrypt.compare(password, account.passwordHash)) {
      if (account.failedLogins > 0 || account.lockedUntil) {
        await this.accountModel.updateOne({ _id: account._id }, { $set: { failedLogins: 0, lockedUntil: null } });
      }
      return;
    }
    const failed = account.failedLogins + 1;
    await this.accountModel.updateOne(
      { _id: account._id },
      failed >= MAX_FAILED_LOGINS
        ? { $set: { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } }
        : { $set: { failedLogins: failed } },
    );
    throw new UnauthorizedException("Wrong phone number or password");
  }

  async login(dto: CustomerLoginDto) {
    const account = await this.accountModel.findOne({ phone: normalizePhone(dto.phone) });
    if (!account || !account.active) {
      await bcrypt.compare(dto.password, DUMMY_HASH);
      throw new UnauthorizedException("Wrong phone number or password");
    }
    await this.verifyPassword(account, dto.password);
    return this.issue(account);
  }

  /** The shop's customer record an invite code belongs to, if the code is valid and the phone matches. */
  private async customerForInvite(code: string, phone: string) {
    const codeHash = hashInviteCode(code);
    const customer = await this.customerModel
      .findOne({ appInviteHash: codeHash, appInviteExpiresAt: { $gt: new Date() } })
      .lean();
    if (!customer) {
      throw new BadRequestException("This code is wrong or has expired. Ask the shop for a new one.");
    }
    if (normalizePhone(customer.phone) !== phone) {
      throw new BadRequestException("This phone number doesn't match the one the shop has for you. Ask the shop to check it.");
    }
    // Checked again here: the shop's app limit may have filled up since the code was made.
    await this.limits.assertCanConnectApp(customer.shopId, customer, "customer");
    return { customer, codeHash };
  }

  /** Uses the code up and points the shop's record at the account. Only one redemption can win. */
  private async redeem(customerId: unknown, codeHash: string, accountId: string) {
    const linked = await this.customerModel.findOneAndUpdate(
      { _id: customerId, appInviteHash: codeHash, appInviteExpiresAt: { $gt: new Date() } },
      { $set: { accountId, appInviteHash: null, appInviteExpiresAt: null } },
      { new: true },
    );
    if (!linked) {
      throw new BadRequestException("This code has already been used. Ask the shop for a new one.");
    }
  }

  /**
   * First sign-in with a shop's invite code. Creates the account for a new phone
   * number; for a phone that already has one, the password must match it.
   */
  async join(dto: CustomerJoinDto) {
    const phone = normalizePhone(dto.phone);
    const { customer, codeHash } = await this.customerForInvite(dto.code, phone);

    let account = await this.accountModel.findOne({ phone });
    if (account) {
      if (!account.active) throw new UnauthorizedException("This account has been disabled");
      await this.verifyPassword(account, dto.password);
    } else {
      try {
        account = await this.accountModel.create({
          phone,
          name: dto.name?.trim() || customer.name,
          passwordHash: await bcrypt.hash(dto.password, 10),
        });
      } catch (err) {
        if ((err as { code?: number }).code === 11000) {
          throw new BadRequestException("This phone number already has an account. Enter that account's password.");
        }
        throw err;
      }
    }
    await this.redeem(customer._id, codeHash, String(account._id));
    return this.issue(account);
  }

  /** Adds another shop to a signed-in account. */
  async link(signedIn: SignedInCustomer, code: string) {
    const { customer, codeHash } = await this.customerForInvite(code, signedIn.phone);
    await this.redeem(customer._id, codeHash, signedIn._id);
    return this.me(signedIn);
  }

  // ---------------------------------------------------------------- shops

  private linkedRecords(accountId: string) {
    return this.customerModel.find({ accountId }).lean();
  }

  /**
   * Garments the shop already has measurements for: saved per type on the
   * customer, or taken from their past orders. Only these can be ordered online.
   */
  private measuredGarments(
    shop: Pick<Shop, "clothTypes" | "clothTypeMeasurements" | "measurementLabels">,
    customer: Pick<Customer, "measurements" | "measurementsByType">,
    pastOrders: Array<Pick<Order, "orderItems" | "clothType" | "measurements" | "amount">>,
  ): Garment[] {
    const fromOrders = new Map<string, { measurements?: Measurements; price?: number }>();
    // Newest first, so the first value seen for a type is the latest.
    for (const order of pastOrders) {
      const items = order.orderItems?.length
        ? order.orderItems
        : [{ clothType: order.clothType, price: order.amount, quantity: 1, measurements: order.measurements }];
      for (const item of items) {
        const known = fromOrders.get(item.clothType) ?? {};
        if (!known.measurements && nonEmpty(item.measurements)) known.measurements = item.measurements;
        if (known.price === undefined && item.price > 0) known.price = item.price;
        fromOrders.set(item.clothType, known);
      }
    }

    const shopTypes = shop.clothTypes ?? [];
    const candidates = new Set<string>([
      ...Object.keys(customer.measurementsByType ?? {}),
      ...fromOrders.keys(),
      ...(nonEmpty(customer.measurements) ? shopTypes : []),
    ]);

    const garments: Garment[] = [];
    for (const clothType of candidates) {
      if (shopTypes.length > 0 && !shopTypes.includes(clothType)) continue;
      const labels = shop.clothTypeMeasurements?.[clothType] ?? shop.measurementLabels ?? [];
      const legacy = Object.fromEntries(
        Object.entries(customer.measurements ?? {}).filter(([label]) => labels.includes(label)),
      );
      const saved = { ...legacy, ...(customer.measurementsByType?.[clothType] ?? {}) };
      const measurements = nonEmpty(saved) ? saved : fromOrders.get(clothType)?.measurements;
      if (!nonEmpty(measurements)) continue;
      garments.push({ clothType, lastPrice: fromOrders.get(clothType)?.price ?? 0, measurements: measurements! });
    }
    return garments.sort((a, b) => shopTypes.indexOf(a.clothType) - shopTypes.indexOf(b.clothType));
  }

  /** Whether this customer may order from this shop through the app, and what they can order. */
  private async orderingState(customer: CustomerDocument | (Customer & { _id: unknown }), shop: Shop & { _id: unknown }) {
    const shopId = String(shop._id);
    const customerId = String(customer._id);
    const [access, pastOrders, pending] = await Promise.all([
      this.subscriptionsService.getAccess(shopId),
      this.orderModel
        .find({ shopId, customerId, status: { $ne: "cancelled" } })
        .sort({ createdAt: -1 })
        .limit(50)
        .select("orderItems clothType measurements amount source status")
        .lean(),
      this.orderModel.countDocuments({ shopId, customerId, source: "customer", status: "draft" }),
    ]);
    // Orders the shop made, or customer requests the shop has since confirmed.
    const established = pastOrders.filter((o) => o.source !== "customer" || o.status !== "draft");
    const garments = this.measuredGarments(shop, customer, established);

    let blockedBy: OrderingBlock | null = null;
    if (access.locked) blockedBy = "shop_unavailable";
    else if (established.length === 0) blockedBy = "no_previous_order";
    else if (garments.length === 0) blockedBy = "no_measurements";
    else if (pending >= MAX_PENDING_REQUESTS) blockedBy = "too_many_pending";
    return { canOrder: blockedBy === null, blockedBy, garments };
  }

  async me(signedIn: SignedInCustomer) {
    const records = await this.linkedRecords(signedIn._id);
    const shops = await this.shopModel
      .find({ _id: { $in: records.map((r) => r.shopId).filter(isValidObjectId) } })
      .lean();
    const byId = new Map(shops.map((s) => [String(s._id), s]));

    const links = await Promise.all(
      records
        .filter((record) => byId.has(record.shopId))
        .map(async (record) => {
          const shop = byId.get(record.shopId)!;
          const state = await this.orderingState(record, shop);
          return {
            shop: { _id: String(shop._id), name: shop.name, phone: shop.phone, address: shop.address ?? null },
            customerName: record.name,
            canOrder: state.canOrder,
            blockedBy: state.blockedBy,
            garments: state.garments.map(({ clothType, lastPrice }) => ({ clothType, lastPrice })),
          };
        }),
    );
    return { customer: signedIn, shops: links };
  }

  /** What the order form needs for one shop, including the saved measurements. */
  async orderForm(signedIn: SignedInCustomer, shopId: string) {
    const { record, shop } = await this.linkFor(signedIn, shopId);
    const state = await this.orderingState(record, shop);
    return {
      shop: { _id: String(shop._id), name: shop.name, phone: shop.phone, address: shop.address ?? null },
      canOrder: state.canOrder,
      blockedBy: state.blockedBy,
      message: state.blockedBy ? BLOCK_MESSAGES[state.blockedBy] : null,
      garments: state.garments,
    };
  }

  private async linkFor(signedIn: SignedInCustomer, shopId: string) {
    const record = isValidObjectId(shopId)
      ? await this.customerModel.findOne({ accountId: signedIn._id, shopId }).lean()
      : null;
    const shop = record ? await this.shopModel.findById(shopId).lean() : null;
    if (!record || !shop) throw new NotFoundException("Shop not found");
    return { record, shop };
  }

  // ---------------------------------------------------------------- orders

  async placeOrder(signedIn: SignedInCustomer, dto: PlaceCustomerOrderDto) {
    const { record, shop } = await this.linkFor(signedIn, dto.shopId);
    const state = await this.orderingState(record, shop);
    if (!state.canOrder) throw new BadRequestException(BLOCK_MESSAGES[state.blockedBy!]);

    const garments = new Map(state.garments.map((g) => [g.clothType, g]));
    const items = dto.items.map((item) => {
      const garment = garments.get(item.clothType);
      if (!garment) {
        throw new BadRequestException(
          `The shop has no measurements for ${item.clothType} for you yet. Visit the shop to get measured first.`,
        );
      }
      return {
        clothType: garment.clothType,
        price: garment.lastPrice,
        quantity: item.quantity,
        measurements: garment.measurements,
        fabricSource: item.fabricSource,
        fabric: item.fabric,
        color: item.color,
        styleNotes: item.styleNotes,
      };
    });

    let deliveryDate: Date | null = null;
    if (dto.deliveryDate) {
      deliveryDate = new Date(dto.deliveryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deliveryDate.getTime() < today.getTime() + 86_400_000 || deliveryDate.getTime() > Date.now() + 365 * 86_400_000) {
        throw new BadRequestException("Pick a delivery date from tomorrow to a year from now.");
      }
    }

    const order = await this.ordersService.createFromCustomer(shop._id.toString(), record, items, {
      customerNote: dto.note?.trim(),
      deliveryDate,
    });
    return this.present(order, shop);
  }

  async listOrders(signedIn: SignedInCustomer) {
    const records = await this.linkedRecords(signedIn._id);
    if (records.length === 0) return [];
    const orders = await this.orderModel
      .find({ $or: records.map((r) => ({ shopId: r.shopId, customerId: String(r._id) })) })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    const shops = await this.shopModel
      .find({ _id: { $in: [...new Set(orders.map((o) => o.shopId))].filter(isValidObjectId) } })
      .select("name phone address")
      .lean();
    const byId = new Map(shops.map((s) => [String(s._id), s]));
    return orders.map((order) => {
      const { payments: _p, statusHistory: _h, ...summary } = this.present(order, byId.get(order.shopId));
      return { ...summary, items: summary.items.map(({ measurements: _im, ...item }) => item) };
    });
  }

  private async ownedOrder(signedIn: SignedInCustomer, orderId: string) {
    const order = isValidObjectId(orderId) ? await this.orderModel.findById(orderId).lean() : null;
    const record = order
      ? await this.customerModel.findOne({ _id: order.customerId, shopId: order.shopId, accountId: signedIn._id }).lean()
      : null;
    if (!order || !record) throw new NotFoundException("Order not found");
    return { order, record };
  }

  async getOrder(signedIn: SignedInCustomer, orderId: string) {
    const { order } = await this.ownedOrder(signedIn, orderId);
    const shop = await this.shopModel.findById(order.shopId).select("name phone address").lean();
    return this.present(order, shop);
  }

  async cancelOrder(signedIn: SignedInCustomer, orderId: string) {
    const { order, record } = await this.ownedOrder(signedIn, orderId);
    const cancelled = await this.ordersService.cancelFromCustomer(order.shopId, String(order._id), record);
    const shop = await this.shopModel.findById(order.shopId).select("name phone address").lean();
    return this.present(cancelled, shop);
  }

  /**
   * The customer's view of an order: their garments, measurements, bill and
   * progress. Staff-only details (internal notes, assignee, who took a payment)
   * are left out.
   */
  private present(order: Order & { _id: unknown; createdAt?: Date }, shop?: { _id: unknown; name: string; phone: string; address?: string } | null) {
    const items = order.orderItems?.length
      ? order.orderItems
      : [{ clothType: order.clothType, price: order.amount, quantity: 1, measurements: order.measurements }];
    const payable = Math.max((order.amount ?? 0) - (order.discount ?? 0), 0);
    return {
      _id: String(order._id),
      orderNo: order.orderNo ?? null,
      shop: shop ? { _id: String(shop._id), name: shop.name, phone: shop.phone, address: shop.address ?? null } : null,
      status: order.status,
      source: order.source ?? "shop",
      customerNote: order.customerNote ?? null,
      items: items.map((item) => ({
        clothType: item.clothType,
        quantity: item.quantity ?? 1,
        price: item.price ?? 0,
        measurements: item.measurements ?? {},
        fabricSource: "fabricSource" in item ? item.fabricSource ?? null : null,
        fabric: "fabric" in item ? item.fabric ?? null : null,
        color: "color" in item ? item.color ?? null : null,
        colorHex: "colorHex" in item ? item.colorHex ?? null : null,
        styleNotes: "styleNotes" in item ? item.styleNotes ?? null : null,
      })),
      amount: order.amount ?? 0,
      discount: order.discount ?? 0,
      payable,
      paidAmount: order.paidAmount ?? 0,
      due: order.status === "cancelled" ? 0 : Math.max(payable - (order.paidAmount ?? 0), 0),
      payments: (order.payments ?? []).map((p) => ({ amount: p.amount, method: p.method, paidAt: p.paidAt })),
      statusHistory: (order.statusHistory ?? []).map((h) => ({ status: h.status, at: h.at })),
      deliveryDate: order.deliveryDate ?? null,
      createdAt: order.createdAt ?? null,
      canCancel: order.source === "customer" && order.status === "draft",
    };
  }
}
