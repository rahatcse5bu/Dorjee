import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import {
  UpdateClothTypesDto,
  UpdateMeasurementLabelsDto,
} from "./dto/update-catalog.dto";
import { CatalogService } from "./catalog.service";

@Controller("shops/:shopId/catalog")
@UseGuards(JwtAuthGuard, TenantGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  getCatalog(@Param("shopId") shopId: string) {
    return this.catalogService.getCatalog(shopId);
  }

  @Put("measurements")
  updateMeasurements(
    @Param("shopId") shopId: string,
    @Body() payload: UpdateMeasurementLabelsDto,
  ) {
    return this.catalogService.updateMeasurements(shopId, payload.measurementLabels ?? []);
  }

  @Put("cloth-types")
  updateClothTypes(@Param("shopId") shopId: string, @Body() payload: UpdateClothTypesDto) {
    return this.catalogService.updateClothTypes(shopId, payload.clothTypes ?? []);
  }
}
