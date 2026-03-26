import { UserRole } from "@dorjee/types";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true })
  role!: UserRole;

  @Prop({ type: String, default: null })
  shopId?: string | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
