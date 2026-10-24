import { UserRole } from "@dorjee/types";
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { ShopsService } from "../shops/shops.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { UsersService } from "../users/users.service";
import { LoginDto } from "./dto/login.dto";
import { AdminRegisterDto } from "./dto/admin-register.dto";
import { BootstrapAdminDto } from "./dto/bootstrap-admin.dto";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly shopsService: ShopsService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException("Email already in use");
    }

    const shop = await this.shopsService.create({
      name: dto.shopName,
      ownerName: dto.ownerName,
      phone: dto.phone,
      email: dto.email,
      address: dto.address,
    });
    if (shop.trialEndsAt) {
      await this.subscriptionsService.upsertTrial(shop.id, new Date(shop.trialEndsAt));
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      role: "shop_owner",
      shopId: shop.id,
      name: dto.ownerName,
      phone: dto.phone,
    });

    return this.issueTokens(user.id, user.role, user.shopId ?? undefined, {
      name: user.name,
      email: user.email,
    });
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.active === false) {
      throw new UnauthorizedException("This account has been disabled. Contact your shop owner.");
    }

    return this.issueTokens(user._id.toString(), user.role, user.shopId ?? undefined, {
      name: user.name,
      email: user.email,
    });
  }

  async registerAdmin(dto: AdminRegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException("Email already in use");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      role: dto.role,
      shopId: null,
    });

    return this.issueTokens(user.id, user.role, undefined);
  }

  async bootstrapAdmin(dto: BootstrapAdminDto) {
    const expectedKey = process.env.ADMIN_BOOTSTRAP_KEY;
    if (!expectedKey || dto.bootstrapKey !== expectedKey) {
      throw new UnauthorizedException("Invalid bootstrap key");
    }

    const hasSuperAdmin = await this.usersService.findOneByRole("super_admin");
    if (hasSuperAdmin) {
      throw new BadRequestException("Super admin is already bootstrapped");
    }

    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException("Email already in use");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      role: "super_admin",
      shopId: null,
    });

    return this.issueTokens(user.id, user.role, undefined);
  }

  private issueTokens(
    userId: string,
    role: UserRole,
    shopId?: string,
    profile: { name?: string; email?: string } = {},
  ) {
    const payload = { sub: userId, role, shopId };
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? "change_me_access",
      expiresIn: process.env.JWT_ACCESS_EXPIRES ?? "15m",
    });

    return { accessToken, user: { ...payload, ...profile } };
  }
}
