import { Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthUser } from "../common/auth-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { TenantGuard } from "../common/guards/tenant.guard";
import { NotificationsService } from "./notifications.service";

// Everyone only ever sees and changes their own notifications.
@Controller("shops/:shopId/notifications")
@UseGuards(JwtAuthGuard, TenantGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@Param("shopId") shopId: string, @CurrentUser() user: AuthUser) {
    return this.notificationsService.listForUser(shopId, user.sub);
  }

  @Post("read-all")
  markAllRead(@Param("shopId") shopId: string, @CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllRead(shopId, user.sub);
  }

  @Patch(":notificationId/read")
  markRead(
    @Param("shopId") shopId: string,
    @Param("notificationId") notificationId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.notificationsService.markRead(shopId, user.sub, notificationId);
  }
}
