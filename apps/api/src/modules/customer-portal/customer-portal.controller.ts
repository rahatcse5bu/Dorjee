import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentCustomer, CustomerAuthGuard, SignedInCustomer } from "./customer-auth.guard";
import { CustomerPortalService } from "./customer-portal.service";
import { CustomerJoinDto, CustomerLinkDto, CustomerLoginDto, PlaceCustomerOrderDto } from "./dto/portal.dto";

/** The customer app: customers see their orders at linked shops and request new ones. */
@Controller("customer")
export class CustomerPortalController {
  constructor(private readonly portal: CustomerPortalService) {}

  @Post("auth/login")
  @HttpCode(200)
  login(@Body() dto: CustomerLoginDto) {
    return this.portal.login(dto);
  }

  @Post("auth/join")
  @HttpCode(200)
  join(@Body() dto: CustomerJoinDto) {
    return this.portal.join(dto);
  }

  @Get("me")
  @UseGuards(CustomerAuthGuard)
  me(@CurrentCustomer() customer: SignedInCustomer) {
    return this.portal.me(customer);
  }

  @Post("links")
  @UseGuards(CustomerAuthGuard)
  link(@CurrentCustomer() customer: SignedInCustomer, @Body() dto: CustomerLinkDto) {
    return this.portal.link(customer, dto.code);
  }

  @Get("shops/:shopId/order-form")
  @UseGuards(CustomerAuthGuard)
  orderForm(@CurrentCustomer() customer: SignedInCustomer, @Param("shopId") shopId: string) {
    return this.portal.orderForm(customer, shopId);
  }

  @Get("orders")
  @UseGuards(CustomerAuthGuard)
  listOrders(@CurrentCustomer() customer: SignedInCustomer) {
    return this.portal.listOrders(customer);
  }

  @Post("orders")
  @UseGuards(CustomerAuthGuard)
  placeOrder(@CurrentCustomer() customer: SignedInCustomer, @Body() dto: PlaceCustomerOrderDto) {
    return this.portal.placeOrder(customer, dto);
  }

  @Get("orders/:orderId")
  @UseGuards(CustomerAuthGuard)
  getOrder(@CurrentCustomer() customer: SignedInCustomer, @Param("orderId") orderId: string) {
    return this.portal.getOrder(customer, orderId);
  }

  @Post("orders/:orderId/cancel")
  @HttpCode(200)
  @UseGuards(CustomerAuthGuard)
  cancelOrder(@CurrentCustomer() customer: SignedInCustomer, @Param("orderId") orderId: string) {
    return this.portal.cancelOrder(customer, orderId);
  }
}
