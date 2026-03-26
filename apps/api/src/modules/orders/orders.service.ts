import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { Order, OrderDocument } from "./schemas/order.schema";

@Injectable()
export class OrdersService {
  constructor(@InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>) {}

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

  create(shopId: string, payload: CreateOrderDto) {
    const normalizedItems = this.normalizeOrderItems(payload.orderItems);
    const computedAmount =
      normalizedItems.length > 0 ? this.totalAmount(normalizedItems) : payload.amount;

    return this.orderModel.create({
      ...payload,
      shopId,
      orderItems: normalizedItems,
      clothType: normalizedItems[0]?.clothType ?? payload.clothType,
      measurements: normalizedItems[0]?.measurements ?? payload.measurements ?? {},
      amount: computedAmount,
      deliveryDate: payload.deliveryDate ? new Date(payload.deliveryDate) : null,
      status: payload.status ?? "draft",
    });
  }

  list(shopId: string) {
    return this.orderModel.find({ shopId }).sort({ createdAt: -1 }).lean();
  }

  async update(shopId: string, orderId: string, payload: UpdateOrderDto) {
    const normalizedPayload: Record<string, unknown> = { ...payload };
    if (payload.deliveryDate) {
      normalizedPayload.deliveryDate = new Date(payload.deliveryDate);
    }

    if (payload.orderItems) {
      const normalizedItems = this.normalizeOrderItems(payload.orderItems);
      normalizedPayload.orderItems = normalizedItems;
      if (normalizedItems.length > 0) {
        normalizedPayload.amount = this.totalAmount(normalizedItems);
        normalizedPayload.clothType = normalizedItems[0].clothType;
        normalizedPayload.measurements = normalizedItems[0].measurements;
      }
    }

    const updated = await this.orderModel
      .findOneAndUpdate({ _id: orderId, shopId }, normalizedPayload, { new: true })
      .lean();

    if (!updated) {
      throw new NotFoundException("Order not found");
    }

    return updated;
  }

  async remove(shopId: string, orderId: string) {
    const deleted = await this.orderModel.findOneAndDelete({ _id: orderId, shopId }).lean();
    if (!deleted) {
      throw new NotFoundException("Order not found");
    }
    return { success: true };
  }
}
