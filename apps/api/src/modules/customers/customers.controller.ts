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
import { CustomerLimitsService } from "./customer-limits.service";
import { CustomersService } from "./customers.service";
import { PermissionsGuard, RequirePermission } from "../permissions/permissions.guard";

@Controller("shops/:shopId/customers")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly limitsService: CustomerLimitsService,
  ) {}

  @Get()
  @RequirePermission(["customers", "view"], ["orders", "view"])
  list(@Param("shopId") shopId: string) {
    return this.customersService.list(shopId);
  }

  /** How many customers (and customer-app users) the shop has, against its limits. */
  @Get("limits")
  @RequirePermission(["customers", "view"], ["orders", "view"])
  limits(@Param("shopId") shopId: string) {
    return this.limitsService.usage(shopId);
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

  @Post(":customerId/app-invite")
  @RequirePermission(["customers", "manage"])
  createAppInvite(@Param("shopId") shopId: string, @Param("customerId") customerId: string) {
    return this.customersService.createAppInvite(shopId, customerId);
  }

  @Delete(":customerId/app-link")
  @RequirePermission(["customers", "manage"])
  unlinkApp(@Param("shopId") shopId: string, @Param("customerId") customerId: string) {
    return this.customersService.unlinkApp(shopId, customerId);
  }

  @Delete(":customerId")
  @RequirePermission(["customers", "manage"])
  remove(@Param("shopId") shopId: string, @Param("customerId") customerId: string) {
    return this.customersService.remove(shopId, customerId);
  }
}
