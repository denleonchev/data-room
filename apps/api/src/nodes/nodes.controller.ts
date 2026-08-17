import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseFilters,
} from "@nestjs/common";
import type { BreadcrumbDto, NodeDto, SubtreeStatsDto } from "@data-room/shared";
import type { AuthenticatedRequest } from "../auth/auth.guard";
import { AccessService } from "../sharing/access.service";
import { NodeExceptionFilter } from "./node-exception.filter";
import { NodeService } from "./node.service";
import { NodeTreeService } from "./node-tree.service";
import { CreateFolderDto, ListNodesQueryDto, UpdateNodeDto, toNodeDto } from "./node.dto";

@Controller()
@UseFilters(NodeExceptionFilter)
export class NodesController {
  constructor(
    private readonly nodes: NodeService,
    private readonly tree: NodeTreeService,
    private readonly access: AccessService,
  ) {}

  @Get("data-room")
  async dataRoom(@Req() request: AuthenticatedRequest): Promise<NodeDto> {
    return toNodeDto(await this.nodes.roomFor(request.session.user.id));
  }

  @Get("nodes")
  async list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListNodesQueryDto,
  ): Promise<NodeDto[]> {
    const parent = query.parentId
      ? (
          await this.access.loadAccessible(
            { id: request.session.user.id, email: request.session.user.email },
            query.parentId,
          )
        ).node
      : await this.nodes.roomFor(request.session.user.id);
    const children = await this.nodes.listChildrenOf(parent.id);
    return children.map(toNodeDto);
  }

  @Get("nodes/:id/breadcrumb")
  async breadcrumb(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<BreadcrumbDto[]> {
    const { scopeRootPath } = await this.access.loadAccessible(
      { id: request.session.user.id, email: request.session.user.email },
      id,
    );
    return this.tree.ancestors(id, scopeRootPath ?? undefined);
  }

  @Get("nodes/:id/subtree-stats")
  async subtreeStats(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<SubtreeStatsDto> {
    await this.nodes.load(request.session.user.id, id);
    return this.tree.subtreeStats(id);
  }

  @Post("folders")
  async createFolder(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateFolderDto,
  ): Promise<NodeDto> {
    return toNodeDto(await this.nodes.createFolder(request.session.user.id, body));
  }

  @Patch("nodes/:id")
  async update(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: UpdateNodeDto,
  ): Promise<NodeDto> {
    return toNodeDto(await this.nodes.update(request.session.user.id, id, body));
  }

  @Delete("nodes/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<void> {
    await this.nodes.remove(request.session.user.id, id);
  }
}
