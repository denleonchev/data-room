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
import type { NodeDto, ShareDto } from "@data-room/shared";
import type { AuthenticatedRequest } from "../auth/auth.guard";
import { NodeExceptionFilter } from "../nodes/node-exception.filter";
import { toNodeDto } from "../nodes/node.dto";
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
    const user = { id: request.session.user.id, email: request.session.user.email };
    return toShareDto(await this.shares.create(user, body.nodeId, body.granteeEmail));
  }

  @Get("shared-with-me")
  async sharedWithMe(@Req() request: AuthenticatedRequest): Promise<NodeDto[]> {
    const nodes = await this.shares.listSharedWithMe(request.session.user.email);
    return nodes.map(toNodeDto);
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
