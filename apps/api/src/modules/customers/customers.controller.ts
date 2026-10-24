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
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { CustomersService } from "./customers.service";
import { PermissionsGuard, RequirePermission } from "../permissions/permissions.guard";

@Controller("shops/:shopId/customers")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequirePermission(["customers", "view"], ["orders", "view"])
  list(@Param("shopId") shopId: string) {
    return this.customersService.list(shopId);
  }

  @Get(":customerId")
  @RequirePermission(["customers", "view"], ["orders", "view"])
  getOne(@Param("shopId") shopId: string, @Param("customerId") customerId: string) {
    return this.customersService.findOne(shopId, customerId);
  }

  @Post()
  @RequirePermission(["customers", "manage"])
  create(@Param("shopId") shopId: string, @Body() payload: CreateCustomerDto) {
    return this.customersService.create(shopId, payload);
  }

  @Patch(":customerId")
  @RequirePermission(["customers", "manage"])
  update(
    @Param("shopId") shopId: string,
    @Param("customerId") customerId: string,
    @Body() payload: UpdateCustomerDto,
  ) {
    return this.customersService.update(shopId, customerId, payload);
  }

  @Delete(":customerId")
  @RequirePermission(["customers", "manage"])
  remove(@Param("shopId") shopId: string, @Param("customerId") customerId: string) {
    return this.customersService.remove(shopId, customerId);
  }
}
