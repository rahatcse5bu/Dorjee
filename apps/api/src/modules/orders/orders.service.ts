import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { FilterQuery, isValidObjectId, Model } from "mongoose";
import { AddPaymentDto } from "./dto/add-payment.dto";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { OrderCounter, OrderCounterDocument } from "./schemas/order-counter.schema";
import { Order, OrderDocument } from "./schemas/order.schema";

export interface ListOrdersFilter {
  customerId?: string;
  assignedTo?: string;
  status?: string;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(OrderCounter.name)
    private readonly counterModel: Model<OrderCounterDocument>,
  ) {}

  private normalizeOrderItems(
    orderItems?: Array<{
      clothType?: string;
      price?: number;
      quantity?: number;
      measurements?: Record<string, string | number>;
    }>,
  ) {
    return (orderItems ?? [])
      .filter((item) => item.clothType && typeof item.price === "number")
      .map((item) => ({
        clothType: item.clothType as string,
        price: item.price as number,
        quantity: item.quantity ?? 1,
        measurements: item.measurements ?? {},
      }));
  }

  private totalAmount(
    items: Array<{
      price: number;
      quantity: number;
    }>,
  ) {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  private async nextOrderNo(shopId: string) {
    const counter = await this.counterModel
      .findOneAndUpdate({ shopId }, { $inc: { seq: 1 } }, { upsert: true, new: true })
      .lean();
    return counter.seq;
  }

  // Orders created before order numbers existed get numbered oldest-first.
  private async backfillOrderNumbers(shopId: string) {
    const unnumbered = await this.orderModel
      .find({ shopId, orderNo: { $exists: false } })
      .sort({ createdAt: 1 })
      .select("_id")
      .lean();

    for (const order of unnumbered) {
      const orderNo = await this.nextOrderNo(shopId);
      await this.orderModel.updateOne(
        { _id: order._id, orderNo: { $exists: false } },
        { $set: { orderNo } },
      );
    }
  }

  private async findDocument(shopId: string, orderId: string) {
    if (!isValidObjectId(orderId)) {
      throw new NotFoundException("Order not found");
    }
    const order = await this.orderModel.findOne({ _id: orderId, shopId });
    if (!order) {
      throw new NotFoundException("Order not found");
    }
    return order;
  }

  private assertDiscountFits(amount: number, discount: number) {
    if (discount > amount) {
      throw new BadRequestException("Discount cannot be more than the order total");
    }
  }

  async create(shopId: string, payload: CreateOrderDto, userId?: string) {
    const normalizedItems = this.normalizeOrderItems(payload.orderItems);
    const computedAmount =
      normalizedItems.length > 0 ? this.totalAmount(normalizedItems) : payload.amount;
    const discount = payload.discount ?? 0;
    this.assertDiscountFits(computedAmount, discount);

    const advance = payload.advance ?? 0;
    if (advance > computedAmount - discount) {
      throw new BadRequestException("Advance cannot be more than the payable amount");
    }

    await this.backfillOrderNumbers(shopId);
    const orderNo = await this.nextOrderNo(shopId);
    const status = payload.status ?? "draft";
    const { advance: _advance, advanceMethod, ...orderFields } = payload;

    return this.orderModel.create({
      ...orderFields,
      shopId,
      orderNo,
      orderItems: normalizedItems,
      clothType: normalizedItems[0]?.clothType ?? payload.clothType,
      measurements: normalizedItems[0]?.measurements ?? payload.measurements ?? {},
      amount: computedAmount,
      discount,
      paidAmount: advance,
      payments:
        advance > 0
          ? [{ amount: advance, method: advanceMethod ?? "cash", note: "Advance", receivedBy: userId ?? null }]
          : [],
      status,
      statusHistory: [{ status, by: userId ?? null }],
      deliveryDate: payload.deliveryDate ? new Date(payload.deliveryDate) : null,
      assignedTo: payload.assignedTo || null,
    });
  }

  async list(shopId: string, filter: ListOrdersFilter = {}) {
    await this.backfillOrderNumbers(shopId);

    const query: FilterQuery<OrderDocument> = { shopId };
    if (filter.customerId) query.customerId = filter.customerId;
    if (filter.assignedTo) query.assignedTo = filter.assignedTo;
    if (filter.status) query.status = filter.status;

    return this.orderModel.find(query).sort({ createdAt: -1 }).lean();
  }

  async findOne(shopId: string, orderId: string) {
    await this.backfillOrderNumbers(shopId);
    const order = await this.findDocument(shopId, orderId);
    return order.toObject();
  }

  async update(shopId: string, orderId: string, payload: UpdateOrderDto, userId?: string) {
    const order = await this.findDocument(shopId, orderId);

    if (payload.orderItems) {
      const normalizedItems = this.normalizeOrderItems(payload.orderItems);
      if (normalizedItems.length === 0) {
        throw new BadRequestException("An order needs at least one item");
      }
      order.orderItems = normalizedItems;
      order.amount = this.totalAmount(normalizedItems);
      order.clothType = normalizedItems[0].clothType;
      order.measurements = normalizedItems[0].measurements;
    } else if (payload.amount !== undefined) {
      order.amount = payload.amount;
    }

    if (payload.discount !== undefined) order.discount = payload.discount;
    this.assertDiscountFits(order.amount, order.discount);

    if (payload.status && payload.status !== order.status) {
      order.status = payload.status;
      order.statusHistory.push({ status: payload.status, at: new Date(), by: userId ?? null });
    }

    if (payload.customerId !== undefined) order.customerId = payload.customerId;
    if (payload.clothType !== undefined && !payload.orderItems) order.clothType = payload.clothType;
    if (payload.measurements !== undefined && !payload.orderItems) {
      order.measurements = payload.measurements;
    }
    if (payload.deliveryDate !== undefined) {
      order.deliveryDate = payload.deliveryDate ? new Date(payload.deliveryDate) : undefined;
    }
    if (payload.assignedTo !== undefined) order.assignedTo = payload.assignedTo || null;
    if (payload.notes !== undefined) order.notes = payload.notes;

    order.markModified("measurements");
    await order.save();
    return order.toObject();
  }

  async addPayment(shopId: string, orderId: string, payload: AddPaymentDto, userId?: string) {
    const order = await this.findDocument(shopId, orderId);
    const due = order.amount - (order.discount ?? 0) - (order.paidAmount ?? 0);
    if (payload.amount > due) {
      throw new BadRequestException(`Payment is more than the due amount (৳${Math.max(due, 0)})`);
    }

    order.payments.push({
      amount: payload.amount,
      method: payload.method,
      note: payload.note,
      paidAt: payload.paidAt ? new Date(payload.paidAt) : new Date(),
      receivedBy: userId ?? null,
    });
    order.paidAmount = (order.paidAmount ?? 0) + payload.amount;
    await order.save();
    return order.toObject();
  }

  async removePayment(shopId: string, orderId: string, paymentId: string) {
    const order = await this.findDocument(shopId, orderId);
    const index = order.payments.findIndex((p) => String((p as { _id?: unknown })._id) === paymentId);
    if (index < 0) {
      throw new NotFoundException("Payment not found");
    }

    order.payments.splice(index, 1);
    order.paidAmount = order.payments.reduce((sum, p) => sum + p.amount, 0);
    await order.save();
    return order.toObject();
  }

  async remove(shopId: string, orderId: string) {
    if (!isValidObjectId(orderId)) {
      throw new NotFoundException("Order not found");
    }
    const deleted = await this.orderModel.findOneAndDelete({ _id: orderId, shopId }).lean();
    if (!deleted) {
      throw new NotFoundException("Order not found");
    }
    return { success: true };
  }
}
