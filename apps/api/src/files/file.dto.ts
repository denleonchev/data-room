import { createZodDto } from "nestjs-zod";
import { createFileUploadSchema } from "@data-room/shared";

export class CreateFileUploadDto extends createZodDto(createFileUploadSchema) {}

export interface UploadUrlDto {
  nodeId: string;
  signedUrl: string;
}

export interface DownloadUrlDto {
  downloadUrl: string;
}
