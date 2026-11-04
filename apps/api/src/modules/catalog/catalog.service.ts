import { Injectable } from "@nestjs/common";
import { CreateShopDto } from "../shops/dto/create-shop.dto";
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
      booleanMeasurements: shop?.booleanMeasurements ?? [],
    };
  }

  updateMeasurements(shopId: string, measurementLabels: string[]) {
    return this.shopsService.update(shopId, { measurementLabels });
  }

  async updateClothTypes(
    shopId: string,
    clothTypes: string[],
    clothTypeMeasurements?: Record<string, unknown>,
    booleanMeasurements?: string[],
  ) {
    if (!clothTypeMeasurements) {
      const shop = await this.shopsService.findOne(shopId);
      const update: Partial<CreateShopDto> = { clothTypes };
      if (booleanMeasurements) update.booleanMeasurements = keepKnown(booleanMeasurements, shop?.measurementLabels ?? []);
      return this.shopsService.update(shopId, update);
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

    // Yes/no labels: the given list when sent, else the current one; only labels still in use.
    const booleans = keepKnown(booleanMeasurements ?? shop?.booleanMeasurements ?? [], measurementLabels);

    return this.shopsService.update(shopId, {
      clothTypes,
      clothTypeMeasurements: mapping,
      measurementLabels,
      booleanMeasurements: booleans,
    });
  }
}

/** Unique, trimmed labels that exist in `known`. */
function keepKnown(labels: string[], known: string[]) {
  return [...new Set(labels.map((l) => l.trim()))].filter((l) => known.includes(l));
}
