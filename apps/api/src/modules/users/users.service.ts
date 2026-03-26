import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User, UserDocument } from "./schemas/user.schema";

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  create(payload: Pick<User, "email" | "passwordHash" | "role" | "shopId">) {
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
}
