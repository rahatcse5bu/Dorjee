import { IsObject } from "class-validator";

export class UpdatePermissionsDto {
  // { [role]: { [module]: "none" | "view" | "manage" } }; unknown keys are ignored by the service.
  @IsObject()
  roles!: Record<string, Record<string, string>>;
}
