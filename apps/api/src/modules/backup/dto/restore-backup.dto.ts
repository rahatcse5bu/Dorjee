import { IsIn, IsObject } from "class-validator";

export class RestoreBackupDto {
  @IsIn(["merge", "replace"])
  mode!: "merge" | "replace";

  // The exported backup file; its contents are checked and sanitised by BackupService.
  @IsObject()
  backup!: Record<string, unknown>;
}
