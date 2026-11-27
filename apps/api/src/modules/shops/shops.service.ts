import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { PlatformSettingsService } from "../subscriptions/platform-settings.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { CreateShopDto } from "./dto/create-shop.dto";
import { Shop, ShopDocument } from "./schemas/shop.schema";

@Injectable()
export class ShopsService {
  constructor(
    @InjectModel(Shop.name) private readonly shopModel: Model<ShopDocument>,
    private readonly settings: PlatformSettingsService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async create(dto: CreateShopDto) {
    // Trial length is a platform setting (admin app → Settings).
    const { trialDays } = await this.settings.get();
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
    return this.shopModel.create({
      ...dto,
      trialEndsAt,
      measurementLabels: ["Chest", "Shoulder", "Sleeve", "Collar", "Length", "Waist", "Hip", "Inseam"],
      clothTypes: ["Shirt", "Pant", "Panjabi"],
      clothTypeMeasurements: {
        Shirt: ["Chest", "Shoulder", "Sleeve", "Collar", "Length"],
        Pant: ["Waist", "Hip", "Inseam", "Length"],
        Panjabi: ["Chest", "Shoulder", "Sleeve", "Collar", "Length"],
      },
    });
  }

  /** All shops, each with its live subscription (the stored subscriptionStatus field is not kept up to date). */
  async list(): Promise<Array<Record<string, unknown>>> {
    const shops = (await this.shopModel.find().sort({ createdAt: -1 }).lean()) as Array<Record<string, unknown> & { _id: unknown }>;
    const subs = await this.subscriptions.summaryByShop(shops.map((shop) => String(shop._id)));
    return shops.map((shop) => {
      const subscription = subs.get(String(shop._id)) ?? null;
      return { ...shop, subscriptionStatus: subscription?.status ?? "inactive", subscription };
    });
  }

  findOne(id: string) {
    return this.shopModel.findById(id).lean();
  }

  update(id: string, payload: Partial<CreateShopDto>) {
    return this.shopModel.findByIdAndUpdate(id, payload, { new: true }).lean();
  }
}
