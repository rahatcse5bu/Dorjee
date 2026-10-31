import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { ClientSession, Connection, Model, Types } from "mongoose";
import { Customer, CustomerDocument } from "../customers/schemas/customer.schema";
import { OrderCounter, OrderCounterDocument } from "../orders/schemas/order-counter.schema";
import { FABRIC_SOURCES, Order, ORDER_STATUSES, OrderDocument, PAYMENT_METHODS } from "../orders/schemas/order.schema";
import { Shop, ShopDocument } from "../shops/schemas/shop.schema";
import { User, UserDocument } from "../users/schemas/user.schema";

export const BACKUP_FORMAT = "dorjee-backup";
export const BACKUP_VERSION = 1;

export type RestoreMode = "merge" | "replace";

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 500) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const date = (v: unknown) => {
  if (typeof v !== "string" && !(v instanceof Date)) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};
const digits = (phone: string) => phone.replace(/\D/g, "");

/** Keeps only string/number values, e.g. a measurements map. */
function cleanMeasurements(v: unknown): Record<string, string | number> {
  if (!isObject(v)) return {};
  const out: Record<string, string | number> = {};
  for (const [label, value] of Object.entries(v)) {
    if (typeof value === "number" && Number.isFinite(value)) out[label.slice(0, 80)] = value;
    else if (typeof value === "string" && value.trim()) out[label.slice(0, 80)] = value.trim().slice(0, 80);
  }
  return out;
}

function cleanStringList(v: unknown): string[] {
  return Array.isArray(v) ? [...new Set(v.map((x) => str(x, 80)).filter((x): x is string => !!x))] : [];
}

export interface RestoreResult {
  mode: RestoreMode;
  customers: { added: number; matched: number; skipped: number };
  orders: { added: number; skipped: number };
  usedTransaction: boolean;
}

@Injectable()
export class BackupService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Shop.name) private readonly shopModel: Model<ShopDocument>,
    @InjectModel(Customer.name) private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(OrderCounter.name) private readonly counterModel: Model<OrderCounterDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async export(shopId: string) {
    const shop = await this.shopModel.findById(shopId).lean();
    if (!shop) throw new NotFoundException("Shop not found");

    const [customers, orders, staff] = await Promise.all([
      this.customerModel.find({ shopId }).sort({ createdAt: 1 }).lean(),
      this.orderModel.find({ shopId }).sort({ createdAt: 1 }).lean(),
      this.userModel.find({ shopId }).select("name email phone role active").lean(),
    ]);
    const strip = <T extends Json>(doc: T) => {
      const { shopId: _shop, __v: _v, ...rest } = doc;
      return rest;
    };

    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      shop: {
        name: shop.name,
        ownerName: shop.ownerName,
        phone: shop.phone,
        email: shop.email,
        address: shop.address,
        clothTypes: shop.clothTypes ?? [],
        measurementLabels: shop.measurementLabels ?? [],
        clothTypeMeasurements: shop.clothTypeMeasurements ?? {},
        rolePermissions: shop.rolePermissions ?? undefined,
      },
      // Staff are listed so assignments can be matched by email on restore; no passwords.
      staff,
      customers: customers.map((c) => strip(c as unknown as Json)),
      orders: orders.map((o) => strip(o as unknown as Json)),
    };
  }

  async restore(shopId: string, backup: Json, mode: RestoreMode): Promise<RestoreResult> {
    if (backup.format !== BACKUP_FORMAT) throw new BadRequestException("This file is not a Dorjee backup");
    if (backup.version !== BACKUP_VERSION) throw new BadRequestException(`Unsupported backup version ${String(backup.version)}`);
    if (!Array.isArray(backup.customers) || !Array.isArray(backup.orders) || !isObject(backup.shop)) {
      throw new BadRequestException("The backup file is incomplete");
    }
    const shop = await this.shopModel.findById(shopId).lean();
    if (!shop) throw new NotFoundException("Shop not found");

    try {
      const session = await this.connection.startSession();
      try {
        let result!: RestoreResult;
        await session.withTransaction(async () => {
          result = await this.apply(shopId, shop, backup, mode, session);
        });
        return { ...result, usedTransaction: true };
      } finally {
        await session.endSession();
      }
    } catch (err) {
      // Standalone MongoDB (e.g. a local dev server) has no transactions; restore without one.
      const message = err instanceof Error ? err.message : "";
      if (/replica set|Transaction numbers|transactions are not supported/i.test(message)) {
        return { ...(await this.apply(shopId, shop, backup, mode)), usedTransaction: false };
      }
      throw err;
    }
  }

  private async apply(
    shopId: string,
    shop: Shop,
    backup: Json,
    mode: RestoreMode,
    session?: ClientSession,
  ): Promise<RestoreResult> {
    const opts = session ? { session } : {};
    const result: RestoreResult = {
      mode,
      customers: { added: 0, matched: 0, skipped: 0 },
      orders: { added: 0, skipped: 0 },
      usedTransaction: !!session,
    };

    // Staff ids in the backup are re-pointed to current staff with the same email.
    const currentStaff = await this.userModel.find({ shopId }).select("email").session(session ?? null).lean();
    const staffIdByEmail = new Map(currentStaff.map((u) => [u.email.toLowerCase(), u._id.toString()]));
    const staffMap = new Map<string, string>();
    for (const member of Array.isArray(backup.staff) ? backup.staff : []) {
      if (!isObject(member)) continue;
      const email = str(member.email)?.toLowerCase();
      const current = email ? staffIdByEmail.get(email) : undefined;
      if (current && member._id) staffMap.set(String(member._id), current);
    }
    const mapUser = (id: unknown) => (id ? staffMap.get(String(id)) ?? null : null);

    if (mode === "replace") {
      await this.customerModel.deleteMany({ shopId }, opts);
      await this.orderModel.deleteMany({ shopId }, opts);
    }

    // Customers: new ids always; in merge mode an existing phone number is reused.
    const existingByPhone = new Map<string, string>();
    if (mode === "merge") {
      const existing = await this.customerModel.find({ shopId }).select("phone").session(session ?? null).lean();
      for (const c of existing) existingByPhone.set(digits(c.phone), c._id.toString());
    }
    const customerIdMap = new Map<string, string>();
    const customerDocs: Json[] = [];
    for (const raw of backup.customers as unknown[]) {
      if (!isObject(raw)) continue;
      const name = str(raw.name, 120);
      const phone = str(raw.phone, 40);
      if (!name || !phone) {
        result.customers.skipped += 1;
        continue;
      }
      const match = existingByPhone.get(digits(phone));
      if (match) {
        customerIdMap.set(String(raw._id), match);
        result.customers.matched += 1;
        continue;
      }
      const _id = new Types.ObjectId();
      customerIdMap.set(String(raw._id), _id.toString());
      existingByPhone.set(digits(phone), _id.toString());
      const measurementsByType: Record<string, Record<string, string | number>> = {};
      if (isObject(raw.measurementsByType)) {
        for (const [type, values] of Object.entries(raw.measurementsByType)) {
          measurementsByType[type.slice(0, 80)] = cleanMeasurements(values);
        }
      }
      customerDocs.push({
        _id,
        shopId,
        name,
        phone,
        address: str(raw.address),
        measurements: cleanMeasurements(raw.measurements),
        measurementsByType,
        createdAt: date(raw.createdAt) ?? new Date(),
        updatedAt: date(raw.updatedAt) ?? new Date(),
      });
    }
    if (customerDocs.length) await this.customerModel.collection.insertMany(customerDocs, opts);
    result.customers.added = customerDocs.length;

    // Orders: skipped when their customer is missing, or (merge) the order number is taken.
    const takenNumbers = new Set<number>();
    if (mode === "merge") {
      const existing = await this.orderModel.find({ shopId }).select("orderNo").session(session ?? null).lean();
      for (const o of existing) if (o.orderNo) takenNumbers.add(o.orderNo);
    }
    const orderDocs: Json[] = [];
    for (const raw of backup.orders as unknown[]) {
      if (!isObject(raw)) continue;
      const customerId = customerIdMap.get(String(raw.customerId));
      const orderNo = num(raw.orderNo);
      if (!customerId || (orderNo !== undefined && takenNumbers.has(orderNo))) {
        result.orders.skipped += 1;
        continue;
      }
      const items = (Array.isArray(raw.orderItems) ? raw.orderItems : [])
        .filter(isObject)
        .map((item) => ({
          clothType: str(item.clothType, 80) ?? "—",
          price: Math.max(num(item.price) ?? 0, 0),
          quantity: Math.max(Math.round(num(item.quantity) ?? 1), 1),
          measurements: cleanMeasurements(item.measurements),
          fabricSource: (FABRIC_SOURCES as readonly string[]).includes(String(item.fabricSource)) ? item.fabricSource : undefined,
          fabric: str(item.fabric, 80),
          color: str(item.color, 60),
          colorHex: typeof item.colorHex === "string" && /^#[0-9a-fA-F]{6}$/.test(item.colorHex) ? item.colorHex : undefined,
          styleNotes: str(item.styleNotes),
        }));
      const payments = (Array.isArray(raw.payments) ? raw.payments : [])
        .filter(isObject)
        .filter((p) => (num(p.amount) ?? 0) > 0)
        .map((p) => ({
          _id: new Types.ObjectId(),
          amount: num(p.amount)!,
          method: (PAYMENT_METHODS as readonly string[]).includes(String(p.method)) ? p.method : "other",
          note: str(p.note),
          paidAt: date(p.paidAt) ?? new Date(),
          receivedBy: mapUser(p.receivedBy),
        }));
      const statusHistory = (Array.isArray(raw.statusHistory) ? raw.statusHistory : [])
        .filter(isObject)
        .filter((h) => (ORDER_STATUSES as readonly string[]).includes(String(h.status)))
        .map((h) => ({ status: h.status, at: date(h.at) ?? new Date(), by: mapUser(h.by) }));
      const status = (ORDER_STATUSES as readonly string[]).includes(String(raw.status)) ? raw.status : "draft";
      const amount = Math.max(num(raw.amount) ?? items.reduce((s, i) => s + i.price * i.quantity, 0), 0);

      if (orderNo !== undefined) takenNumbers.add(orderNo);
      orderDocs.push({
        _id: new Types.ObjectId(),
        shopId,
        orderNo,
        customerId,
        orderItems: items,
        clothType: items[0]?.clothType ?? str(raw.clothType, 80) ?? "—",
        measurements: items[0]?.measurements ?? {},
        status,
        amount,
        discount: Math.min(Math.max(num(raw.discount) ?? 0, 0), amount),
        paidAmount: payments.reduce((s, p) => s + p.amount, 0),
        payments,
        statusHistory,
        deliveryDate: date(raw.deliveryDate) ?? null,
        assignedTo: mapUser(raw.assignedTo),
        notes: str(raw.notes, 2000),
        createdAt: date(raw.createdAt) ?? new Date(),
        updatedAt: date(raw.updatedAt) ?? new Date(),
      });
    }
    if (orderDocs.length) await this.orderModel.collection.insertMany(orderDocs, opts);
    result.orders.added = orderDocs.length;

    // Keep new order numbers above everything now in the shop.
    const top = await this.orderModel.findOne({ shopId, orderNo: { $ne: null } }).sort({ orderNo: -1 }).select("orderNo").session(session ?? null).lean();
    await this.counterModel.updateOne({ shopId }, { $set: { seq: top?.orderNo ?? 0 } }, { upsert: true, ...opts });

    await this.restoreCatalog(shopId, shop, backup.shop as Json, mode, opts);
    return result;
  }

  /** Replace: take the backup's catalog. Merge: add cloth types and labels the shop lacks. */
  private async restoreCatalog(shopId: string, shop: Shop, saved: Json, mode: RestoreMode, opts: { session?: ClientSession }) {
    const savedTypes = cleanStringList(saved.clothTypes);
    const savedLabels = cleanStringList(saved.measurementLabels);
    const savedMapping: Record<string, string[]> = {};
    if (isObject(saved.clothTypeMeasurements)) {
      for (const [type, labels] of Object.entries(saved.clothTypeMeasurements)) savedMapping[type.slice(0, 80)] = cleanStringList(labels);
    }

    const update: Json = {};
    if (mode === "replace") {
      update.clothTypes = savedTypes;
      update.measurementLabels = savedLabels;
      update.clothTypeMeasurements = savedMapping;
      if (isObject(saved.rolePermissions)) update.rolePermissions = saved.rolePermissions;
    } else {
      const types = [...(shop.clothTypes ?? [])];
      const mapping = { ...(shop.clothTypeMeasurements ?? {}) };
      for (const type of savedTypes) {
        if (!types.includes(type)) {
          types.push(type);
          if (savedMapping[type]) mapping[type] = savedMapping[type];
        }
      }
      const labels = [...(shop.measurementLabels ?? [])];
      for (const label of savedLabels) if (!labels.includes(label)) labels.push(label);
      update.clothTypes = types;
      update.measurementLabels = labels;
      update.clothTypeMeasurements = mapping;
    }
    await this.shopModel.updateOne({ _id: shopId }, { $set: update }, opts);
  }
}
