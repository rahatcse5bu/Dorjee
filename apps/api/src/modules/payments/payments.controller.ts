import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthUser } from "../common/auth-user";
import { RolesGuard } from "../common/guards/roles.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { CreateManualPaymentDto } from "./dto/create-manual-payment.dto";
import { ReviewPaymentDto } from "./dto/review-payment.dto";
import { PaymentsService } from "./payments.service";

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("shops/:shopId/payments/manual")
  @UseGuards(JwtAuthGuard, TenantGuard)
  createManual(
    @Param("shopId") shopId: string,
    @Body() payload: CreateManualPaymentDto,
  ) {
    return this.paymentsService.createManual({
      shopId,
      method: payload.method,
      transactionId: payload.transactionId,
      proofImageUrl: payload.proofImageUrl,
    });
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
  @UseGuards(JwtAuthGuard, TenantGuard)
  listByShop(@Param("shopId") shopId: string) {
    return this.paymentsService.listByShop(shopId);
  }

  @Patch("admin/payments/:paymentId/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin", "admin_finance")
  approve(
    @Param("paymentId") paymentId: string,
    @CurrentUser() user: AuthUser,
    @Body() _payload: ReviewPaymentDto,
  ) {
    return this.paymentsService.approve(paymentId, user.sub);
  }

  @Patch("admin/payments/:paymentId/reject")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin", "admin_finance")
  reject(
    @Param("paymentId") paymentId: string,
    @CurrentUser() user: AuthUser,
    @Body() _payload: ReviewPaymentDto,
  ) {
    return this.paymentsService.reject(paymentId, user.sub);
  }
}
