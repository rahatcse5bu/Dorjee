import { IsArray, IsString } from "class-validator";

export class UpdateMeasurementLabelsDto {
  @IsArray()
  @IsString({ each: true })
  measurementLabels!: string[];
}

export class UpdateClothTypesDto {
  @IsArray()
  @IsString({ each: true })
  clothTypes!: string[];
}
