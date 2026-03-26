import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Customer, CustomerDocument } from "./schemas/customer.schema";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private readonly customerModel: Model<CustomerDocument>,
  ) {}

  create(shopId: string, payload: CreateCustomerDto) {
    return this.customerModel.create({ ...payload, shopId });
  }

  list(shopId: string) {
    return this.customerModel.find({ shopId }).sort({ createdAt: -1 }).lean();
  }

  async update(shopId: string, customerId: string, payload: UpdateCustomerDto) {
    const updated = await this.customerModel
      .findOneAndUpdate({ _id: customerId, shopId }, payload, { new: true })
      .lean();

    if (!updated) {
      throw new NotFoundException("Customer not found");
    }
    return updated;
  }

  async remove(shopId: string, customerId: string) {
    const deleted = await this.customerModel.findOneAndDelete({ _id: customerId, shopId }).lean();
    if (!deleted) {
      throw new NotFoundException("Customer not found");
    }
    return { success: true };
  }
}
