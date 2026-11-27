import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model } from "mongoose";
import { Customer, CustomerDocument } from "./schemas/customer.schema";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { CustomerLimitsService } from "./customer-limits.service";
import { hashInviteCode, INVITE_TTL_DAYS, newInviteCode } from "../common/customer-app";

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private readonly customerModel: Model<CustomerDocument>,
    private readonly limits: CustomerLimitsService,
  ) {}

  async create(shopId: string, payload: CreateCustomerDto) {
    await this.limits.assertCanAddCustomers(shopId);
    return this.customerModel.create({ ...payload, shopId });
  }

  list(shopId: string) {
    return this.customerModel.find({ shopId }).sort({ createdAt: -1 }).lean();
  }

  async findOne(shopId: string, customerId: string) {
    const customer = isValidObjectId(customerId)
      ? await this.customerModel.findOne({ _id: customerId, shopId }).lean()
      : null;
    if (!customer) {
      throw new NotFoundException("Customer not found");
    }
    return customer;
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

  /**
   * A one-time code the customer uses to connect the customer app to this record.
   * A new code replaces any earlier one. Returned once; only its hash is stored.
   */
  async createAppInvite(shopId: string, customerId: string) {
    const customer = await this.findOne(shopId, customerId);
    await this.limits.assertCanConnectApp(shopId, customer);
    const code = newInviteCode();
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000);
    await this.customerModel.updateOne(
      { _id: customerId, shopId },
      { $set: { appInviteHash: hashInviteCode(code), appInviteExpiresAt: expiresAt } },
    );
    return { code, expiresAt };
  }

  /** Disconnects the customer app account and voids any open invite. */
  async unlinkApp(shopId: string, customerId: string) {
    await this.findOne(shopId, customerId);
    return this.customerModel
      .findOneAndUpdate(
        { _id: customerId, shopId },
        { $set: { accountId: null, appInviteHash: null, appInviteExpiresAt: null } },
        { new: true },
      )
      .lean();
  }

  async remove(shopId: string, customerId: string) {
    const deleted = await this.customerModel.findOneAndDelete({ _id: customerId, shopId }).lean();
    if (!deleted) {
      throw new NotFoundException("Customer not found");
    }
    return { success: true };
  }
}
