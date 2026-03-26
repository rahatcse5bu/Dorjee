import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CreateShopDto } from "./dto/create-shop.dto";
import { Shop, ShopDocument } from "./schemas/shop.schema";

@Injectable()
export class ShopsService {
  constructor(@InjectModel(Shop.name) private readonly shopModel: Model<ShopDocument>) {}

  create(dto: CreateShopDto) {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);
    return this.shopModel.create({
      ...dto,
      trialEndsAt,
      measurementLabels: ["Chest", "Waist", "Length", "Shoulder"],
      clothTypes: ["Shirt", "Pant", "Panjabi"],
    });
  }

  list() {
    return this.shopModel.find().sort({ createdAt: -1 }).lean();
  }

  findOne(id: string) {
    return this.shopModel.findById(id).lean();
  }

  update(id: string, payload: Partial<CreateShopDto>) {
    return this.shopModel.findByIdAndUpdate(id, payload, { new: true }).lean();
  }
}
