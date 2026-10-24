import { IsArray, IsObject, IsOptional, IsString } from "class-validator";

export class UpdateMeasurementLabelsDto {
  @IsArray()
  @IsString({ each: true })
  measurementLabels!: string[];
}

export class UpdateClothTypesDto {
  @IsArray()
  @IsString({ each: true })
  clothTypes!: string[];

  // { [clothType]: measurement labels }; sanitised by CatalogService.
  @IsOptional()
  @IsObject()
  clothTypeMeasurements?: Record<string, string[]>;
}
