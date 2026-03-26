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
    };
  }

  updateMeasurements(shopId: string, measurementLabels: string[]) {
    return this.shopsService.update(shopId, { measurementLabels });
  }

  updateClothTypes(shopId: string, clothTypes: string[]) {
    return this.shopsService.update(shopId, { clothTypes });
  }
}
