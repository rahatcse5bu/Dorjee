import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthUser } from "../common/auth-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { UpdatePlatformSettingsDto } from "./dto/update-platform-settings.dto";
import { PlatformSettingsService } from "./platform-settings.service";

/** Public price list, so the shop app and website show the same prices. */
@Controller("subscription-plans")
export class PlansController {
  constructor(private readonly settings: PlatformSettingsService) {}

  /** Each plan on sale, with the Send Money amount (cash-out charge included). */
  @Get()
  list() {
    return this.settings.purchasablePlans();
  }

  /** How shops can pay, and the trial length shown on sign-up. */
  @Get("payment-info")
  async paymentInfo() {
    const s = await this.settings.get();
    return {
      method: "bkash_manual",
      bkashNumber: s.bkashNumber,
      accountType: "personal",
      cashoutPerThousand: s.cashoutPerThousand,
      manualPayment: s.manualPaymentEnabled,
      bkashOnline: s.bkashOnline,
      trialDays: s.trialDays,
      graceDays: s.graceDays,
    };
  }
}

/** Platform settings for the admin app. */
@Controller("admin/settings")
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlatformSettingsController {
  constructor(private readonly settings: PlatformSettingsService) {}

  @Get()
  @Roles("super_admin", "admin_finance", "admin_support")
  get() {
    return this.settings.get();
  }

  @Put()
  @Roles("super_admin", "admin_finance")
  update(@Body() dto: UpdatePlatformSettingsDto, @CurrentUser() user: AuthUser) {
    return this.settings.update(dto, user.sub);
  }
}
