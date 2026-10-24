import {
  Body,
  Controller,
  Delete,
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
import { AddPaymentDto } from "./dto/add-payment.dto";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { OrdersService } from "./orders.service";

@Controller("shops/:shopId/orders")
@UseGuards(JwtAuthGuard, TenantGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  list(
    @Param("shopId") shopId: string,
    @Query("customerId") customerId?: string,
    @Query("assignedTo") assignedTo?: string,
    @Query("status") status?: string,
  ) {
    return this.ordersService.list(shopId, { customerId, assignedTo, status });
  }

  @Get(":orderId")
  getOne(@Param("shopId") shopId: string, @Param("orderId") orderId: string) {
    return this.ordersService.findOne(shopId, orderId);
  }

  @Post()
  create(
    @Param("shopId") shopId: string,
    @Body() payload: CreateOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordersService.create(shopId, payload, user.sub);
  }

  @Patch(":orderId")
  update(
    @Param("shopId") shopId: string,
    @Param("orderId") orderId: string,
    @Body() payload: UpdateOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordersService.update(shopId, orderId, payload, user.sub);
  }

  @Post(":orderId/payments")
  addPayment(
    @Param("shopId") shopId: string,
    @Param("orderId") orderId: string,
    @Body() payload: AddPaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordersService.addPayment(shopId, orderId, payload, user.sub);
  }

  @Delete(":orderId/payments/:paymentId")
  removePayment(
    @Param("shopId") shopId: string,
    @Param("orderId") orderId: string,
    @Param("paymentId") paymentId: string,
  ) {
    return this.ordersService.removePayment(shopId, orderId, paymentId);
  }

  @Delete(":orderId")
  remove(@Param("shopId") shopId: string, @Param("orderId") orderId: string) {
    return this.ordersService.remove(shopId, orderId);
  }
}
