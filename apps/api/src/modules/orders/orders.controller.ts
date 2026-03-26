import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { OrdersService } from "./orders.service";

@Controller("shops/:shopId/orders")
@UseGuards(JwtAuthGuard, TenantGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  list(@Param("shopId") shopId: string) {
    return this.ordersService.list(shopId);
  }

  @Post()
  create(@Param("shopId") shopId: string, @Body() payload: CreateOrderDto) {
    return this.ordersService.create(shopId, payload);
  }

  @Patch(":orderId")
  update(
    @Param("shopId") shopId: string,
    @Param("orderId") orderId: string,
    @Body() payload: UpdateOrderDto,
  ) {
    return this.ordersService.update(shopId, orderId, payload);
  }

  @Delete(":orderId")
  remove(@Param("shopId") shopId: string, @Param("orderId") orderId: string) {
    return this.ordersService.remove(shopId, orderId);
  }
}
