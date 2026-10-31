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

  async updateClothTypes(shopId: string, clothTypes: string[], clothTypeMeasurements?: Record<string, unknown>) {
    if (!clothTypeMeasurements) {
      return this.shopsService.update(shopId, { clothTypes });
    }
    // Each cloth type owns its measurement names: keep entries only for existing
    // types, with unique non-empty names (an empty list is allowed).
    const mapping: Record<string, string[]> = {};
    for (const type of clothTypes) {
      const labels = clothTypeMeasurements[type];
      if (!Array.isArray(labels)) continue;
      mapping[type] = [
        ...new Set(labels.filter((l): l is string => typeof l === "string" && l.trim() !== "").map((l) => l.trim())),
      ];
    }

    // The shop-wide label list is derived: every name some cloth type uses, keeping
    // the existing order and appending new names. Types without an entry still use it.
    const shop = await this.shopsService.findOne(shopId);
    const used = new Set(Object.values(mapping).flat());
    const unmappedTypesExist = clothTypes.some((type) => !mapping[type]);
    const existing = (shop?.measurementLabels ?? []).filter((label) => unmappedTypesExist || used.has(label));
    const measurementLabels = [...existing, ...[...used].filter((label) => !existing.includes(label))];

    return this.shopsService.update(shopId, { clothTypes, clothTypeMeasurements: mapping, measurementLabels });
  }
}
