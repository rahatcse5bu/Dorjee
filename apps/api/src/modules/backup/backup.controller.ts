import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { SkipSubscriptionCheck } from "../common/decorators/skip-subscription.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { BackupService } from "./backup.service";
import { RestoreBackupDto } from "./dto/restore-backup.dto";

// Backups contain every customer, order and payment, so only the owner may use them.
@Controller("shops/:shopId/backup")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles("shop_owner")
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  // Owners can always take their data with them, paid or not.
  @Get()
  @SkipSubscriptionCheck()
  export(@Param("shopId") shopId: string) {
    return this.backupService.export(shopId);
  }

  @Post("restore")
  restore(@Param("shopId") shopId: string, @Body() dto: RestoreBackupDto) {
    return this.backupService.restore(shopId, dto.backup, dto.mode);
  }
}
