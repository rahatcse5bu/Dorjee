import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthUser } from "../common/auth-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { TenantGuard } from "../common/guards/tenant.guard";
import { PermissionsGuard, RequirePermission } from "../permissions/permissions.guard";
import { PermissionsService } from "../permissions/permissions.service";
import { AddPaymentDto } from "./dto/add-payment.dto";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { OrdersService } from "./orders.service";

type OrderLike = Record<string, unknown> & { orderItems?: Array<Record<string, unknown>> };

/** Removes prices and payments for users who may not see money. */
function withoutFinancials<T extends OrderLike>(order: T): T {
  const { amount: _a, discount: _d, paidAmount: _p, payments: _pay, ...rest } = order;
  return {
    ...rest,
    orderItems: (order.orderItems ?? []).map(({ price: _price, ...item }) => item),
  } as unknown as T;
}

@Controller("shops/:shopId/orders")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly permissionsService: PermissionsService,
  ) {}

  private async present<T>(user: AuthUser, shopId: string, result: T): Promise<T> {
    if (await this.permissionsService.can(user, shopId, "payments", "view")) return result;
    if (Array.isArray(result)) return result.map((o) => withoutFinancials(o as OrderLike)) as T;
    return withoutFinancials(result as OrderLike) as T;
  }

  @Get()
  @RequirePermission(["orders", "view"])
  async list(
    @Param("shopId") shopId: string,
    @CurrentUser() user: AuthUser,
    @Query("customerId") customerId?: string,
    @Query("assignedTo") assignedTo?: string,
    @Query("status") status?: string,
  ) {
    return this.present(user, shopId, await this.ordersService.list(shopId, { customerId, assignedTo, status }));
  }

  @Get(":orderId")
  @RequirePermission(["orders", "view"])
  async getOne(@Param("shopId") shopId: string, @Param("orderId") orderId: string, @CurrentUser() user: AuthUser) {
    return this.present(user, shopId, await this.ordersService.findOne(shopId, orderId));
  }

  @Post()
  @RequirePermission(["orders", "manage"])
  async create(
    @Param("shopId") shopId: string,
    @Body() payload: CreateOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    if ((payload.advance ?? 0) > 0 && !(await this.permissionsService.can(user, shopId, "payments", "manage"))) {
      throw new ForbiddenException("You don't have permission to take payments");
    }
    return this.present(user, shopId, await this.ordersService.create(shopId, payload, user.sub));
  }

  // View access is enough to move an order through its statuses (e.g. a tailor
  // marking work ready); changing anything else needs manage access.
  @Patch(":orderId")
  @RequirePermission(["orders", "view"])
  async update(
    @Param("shopId") shopId: string,
    @Param("orderId") orderId: string,
    @Body() payload: UpdateOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    const changesMoreThanStatus = Object.keys(payload).some(
      (key) => key !== "status" && (payload as Record<string, unknown>)[key] !== undefined,
    );
    if (changesMoreThanStatus && !(await this.permissionsService.can(user, shopId, "orders", "manage"))) {
      throw new ForbiddenException("You can only update the status of this order");
    }
    return this.present(user, shopId, await this.ordersService.update(shopId, orderId, payload, user.sub));
  }

  @Post(":orderId/payments")
  @RequirePermission(["payments", "manage"])
  addPayment(
    @Param("shopId") shopId: string,
    @Param("orderId") orderId: string,
    @Body() payload: AddPaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordersService.addPayment(shopId, orderId, payload, user.sub);
  }

  @Delete(":orderId/payments/:paymentId")
  @RequirePermission(["payments", "manage"])
  removePayment(
    @Param("shopId") shopId: string,
    @Param("orderId") orderId: string,
    @Param("paymentId") paymentId: string,
  ) {
    return this.ordersService.removePayment(shopId, orderId, paymentId);
  }

  @Delete(":orderId")
  @RequirePermission(["orders", "manage"])
  remove(@Param("shopId") shopId: string, @Param("orderId") orderId: string) {
    return this.ordersService.remove(shopId, orderId);
  }
}
