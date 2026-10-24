import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model } from "mongoose";
import { User, UserDocument } from "./schemas/user.schema";

const PUBLIC_FIELDS = "-passwordHash";

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  create(
    payload: Pick<User, "email" | "passwordHash" | "role" | "shopId"> &
      Partial<Pick<User, "name" | "phone">>,
  ) {
    return this.userModel.create(payload);
  }

  findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase() }).lean();
  }

  findById(id: string) {
    return this.userModel.findById(id).lean();
  }

  findOneByRole(role: User["role"]) {
    return this.userModel.findOne({ role }).lean();
  }

  listByShop(shopId: string) {
    return this.userModel.find({ shopId }).select(PUBLIC_FIELDS).sort({ createdAt: 1 }).lean();
  }

  findInShop(shopId: string, userId: string) {
    if (!isValidObjectId(userId)) return null;
    return this.userModel.findOne({ _id: userId, shopId }).select(PUBLIC_FIELDS).lean();
  }

  updateInShop(
    shopId: string,
    userId: string,
    payload: Partial<Pick<User, "name" | "phone" | "role" | "active" | "passwordHash">>,
  ) {
    return this.userModel
      .findOneAndUpdate({ _id: userId, shopId }, payload, { new: true })
      .select(PUBLIC_FIELDS)
      .lean();
  }

  removeFromShop(shopId: string, userId: string) {
    return this.userModel.findOneAndDelete({ _id: userId, shopId }).lean();
  }
}
