import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { SkipSubscriptionCheck } from "../common/decorators/skip-subscription.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthUser } from "../common/auth-user";
import { RolesGuard } from "../common/guards/roles.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { CreateBkashPaymentDto } from "./dto/create-bkash-payment.dto";
import { CreateManualPaymentDto } from "./dto/create-manual-payment.dto";
import { RefundPaymentDto } from "./dto/refund-payment.dto";
import { ReviewPaymentDto } from "./dto/review-payment.dto";
import { PaymentsService } from "./payments.service";
import { PermissionsGuard, RequirePermission } from "../permissions/permissions.guard";

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("shops/:shopId/payments/manual")
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @SkipSubscriptionCheck()
  @RequirePermission(["subscription", "manage"])
  createManual(
    @Param("shopId") shopId: string,
    @Body() payload: CreateManualPaymentDto,
  ) {
    return this.paymentsService.createManual({
      shopId,
      senderNumber: payload.senderNumber,
      transactionId: payload.transactionId,
      planCode: payload.planCode,
    });
  }

  /** Starts a bKash checkout; the shop app redirects the user to the returned bkashURL. */
  @Post("shops/:shopId/payments/bkash")
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @SkipSubscriptionCheck()
  @RequirePermission(["subscription", "manage"])
  createBkash(@Param("shopId") shopId: string, @Body() payload: CreateBkashPaymentDto, @Req() req: Request) {
    return this.paymentsService.createBkash({
      shopId,
      planCode: payload.planCode,
      returnOrigin: payload.returnOrigin ?? req.get("origin"),
      callbackURL: bkashCallbackUrl(req),
    });
  }

  /** bKash redirects the user's browser here after checkout (no login: the paymentID is verified with bKash). */
  @Get("payments/bkash/callback")
  async bkashCallback(
    @Query("paymentID") paymentID: string | undefined,
    @Query("status") status: string | undefined,
    @Res() res: Response,
  ) {
    res.redirect(302, await this.paymentsService.completeBkash(paymentID, status));
  }

  @Get("admin/payments/pending")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin", "admin_finance")
  listPending() {
    return this.paymentsService.listPending();
  }

  @Get("admin/payments/history")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin", "admin_finance", "admin_support")
  listReviewed() {
    return this.paymentsService.listReviewed();
  }

  @Get("shops/:shopId/payments")
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @SkipSubscriptionCheck()
  @RequirePermission(["subscription", "view"])
  listByShop(@Param("shopId") shopId: string) {
    return this.paymentsService.listByShop(shopId);
  }

  @Patch("admin/payments/:paymentId/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin", "admin_finance")
  approve(
    @Param("paymentId") paymentId: string,
    @CurrentUser() user: AuthUser,
    @Body() payload: ReviewPaymentDto,
  ) {
    return this.paymentsService.approve(paymentId, user.sub, payload.notes ?? payload.reason);
  }

  /** Refunds an approved payment (bKash checkout: through bKash; manual: records the refund). */
  @Post("admin/payments/:paymentId/refund")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin", "admin_finance")
  refund(@Param("paymentId") paymentId: string, @CurrentUser() user: AuthUser, @Body() payload: RefundPaymentDto) {
    return this.paymentsService.refund(paymentId, user.sub, payload);
  }

  @Patch("admin/payments/:paymentId/reject")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin", "admin_finance")
  reject(
    @Param("paymentId") paymentId: string,
    @CurrentUser() user: AuthUser,
    @Body() payload: ReviewPaymentDto,
  ) {
    return this.paymentsService.reject(paymentId, user.sub, payload.notes ?? payload.reason);
  }
}

/** This API's own callback address (BKASH_CALLBACK_URL overrides it, e.g. behind a custom domain). */
function bkashCallbackUrl(req: Request) {
  if (process.env.BKASH_CALLBACK_URL) return process.env.BKASH_CALLBACK_URL;
  const proto = (req.get("x-forwarded-proto") ?? req.protocol).split(",")[0].trim();
  return `${proto}://${req.get("x-forwarded-host") ?? req.get("host")}/api/payments/bkash/callback`;
}
