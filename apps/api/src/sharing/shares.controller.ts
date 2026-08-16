import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseFilters,
} from "@nestjs/common";
import type { ShareDto } from "@data-room/shared";
import type { AuthenticatedRequest } from "../auth/auth.guard";
import { NodeExceptionFilter } from "../nodes/node-exception.filter";
import { CreateShareDto, ListSharesQueryDto, toShareDto } from "./share.dto";
import { ShareService } from "./share.service";

@Controller("shares")
@UseFilters(NodeExceptionFilter)
export class SharesController {
  constructor(private readonly shares: ShareService) {}

  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateShareDto,
  ): Promise<ShareDto> {
    return toShareDto(await this.shares.create(request.session.user.id, body.nodeId));
  }

  @Get()
  async list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListSharesQueryDto,
  ): Promise<ShareDto[]> {
    const shares = await this.shares.listForNode(request.session.user.id, query.nodeId);
    return shares.map(toShareDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<void> {
    await this.shares.revoke(request.session.user.id, id);
  }
}
