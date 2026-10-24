import { Injectable } from "@nestjs/common";
import { ShopsService } from "../shops/shops.service";

@Injectable()
export class CatalogService {
  constructor(private readonly shopsService: ShopsService) {}

  async getCatalog(shopId: string) {
    const shop = await this.shopsService.findOne(shopId);
    return {
      shopId,
      measurementLabels: shop?.measurementLabels ?? [],
      clothTypes: shop?.clothTypes ?? [],
      clothTypeMeasurements: shop?.clothTypeMeasurements ?? {},
    };
  }

  updateMeasurements(shopId: string, measurementLabels: string[]) {
    return this.shopsService.update(shopId, { measurementLabels });
  }

  updateClothTypes(shopId: string, clothTypes: string[], clothTypeMeasurements?: Record<string, unknown>) {
    if (!clothTypeMeasurements) {
      return this.shopsService.update(shopId, { clothTypes });
    }
    // Keep entries only for existing cloth types, with unique non-empty label strings.
    const mapping: Record<string, string[]> = {};
    for (const type of clothTypes) {
      const labels = clothTypeMeasurements[type];
      if (!Array.isArray(labels)) continue;
      mapping[type] = [...new Set(labels.filter((l): l is string => typeof l === "string" && l.trim() !== "").map((l) => l.trim()))];
    }
    return this.shopsService.update(shopId, { clothTypes, clothTypeMeasurements: mapping });
  }
}
