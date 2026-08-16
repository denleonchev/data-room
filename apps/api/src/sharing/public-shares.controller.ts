import { Controller, Get, Param, Query, UseFilters } from "@nestjs/common";
import type { BreadcrumbDto, NodeDto } from "@data-room/shared";
import { Public } from "../auth/public.decorator";
import { NodeExceptionFilter } from "../nodes/node-exception.filter";
import { NodeTreeService } from "../nodes/node-tree.service";
import { ListNodesQueryDto, toNodeDto } from "../nodes/node.dto";
import type { DownloadUrlDto } from "../files/file.dto";
import { AccessService } from "./access.service";

@Controller("s")
@Public()
@UseFilters(NodeExceptionFilter)
export class PublicSharesController {
  constructor(
    private readonly access: AccessService,
    private readonly tree: NodeTreeService,
  ) {}

  @Get(":token")
  async root(@Param("token") token: string): Promise<NodeDto> {
    const share = await this.access.resolveToken(token);
    return toNodeDto(share.node);
  }

  @Get(":token/nodes")
  async children(
    @Param("token") token: string,
    @Query() query: ListNodesQueryDto,
  ): Promise<NodeDto[]> {
    const share = await this.access.resolveToken(token);
    const parentId = query.parentId ?? share.node.id;
    const children = await this.access.listChildren(share, parentId);
    return children.map(toNodeDto);
  }

  @Get(":token/nodes/:id/breadcrumb")
  async breadcrumb(
    @Param("token") token: string,
    @Param("id") id: string,
  ): Promise<BreadcrumbDto[]> {
    const share = await this.access.resolveToken(token);
    await this.access.loadWithinShare(share, id);
    return this.tree.ancestors(id, share.node.path);
  }

  @Get(":token/files/:id/download-url")
  async downloadUrl(
    @Param("token") token: string,
    @Param("id") id: string,
  ): Promise<DownloadUrlDto> {
    const share = await this.access.resolveToken(token);
    return { downloadUrl: await this.access.createDownloadUrl(share, id) };
  }
}
