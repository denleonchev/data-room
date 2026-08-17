import { Body, Controller, Get, Param, Post, Req, UseFilters } from "@nestjs/common";
import type { NodeDto } from "@data-room/shared";
import { toNodeDto } from "../nodes/node.dto";
import { NodeExceptionFilter } from "../nodes/node-exception.filter";
import type { AuthenticatedRequest } from "../auth/auth.guard";
import { CreateFileUploadDto, type DownloadUrlDto, type UploadUrlDto } from "./file.dto";
import { FileService } from "./file.service";

@Controller("files")
@UseFilters(NodeExceptionFilter)
export class FilesController {
  constructor(private readonly files: FileService) {}

  @Post("upload-url")
  async createUploadUrl(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateFileUploadDto,
  ): Promise<UploadUrlDto> {
    return this.files.createUploadUrl(request.session.user.id, body);
  }

  @Post(":id/complete")
  async complete(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<NodeDto> {
    return toNodeDto(await this.files.completeUpload(request.session.user.id, id));
  }

  @Get(":id/download-url")
  async downloadUrl(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<DownloadUrlDto> {
    const user = { id: request.session.user.id, email: request.session.user.email };
    return { downloadUrl: await this.files.createDownloadUrl(user, id) };
  }
}
