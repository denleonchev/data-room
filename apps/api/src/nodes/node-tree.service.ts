import { Injectable } from "@nestjs/common";
import { ancestorIds, subtreePrefix } from "@data-room/shared";
import { PrismaService } from "../prisma/prisma.service";
import { NodeNotFoundError } from "./node-errors";

export interface SubtreeStats {
  folders: number;
  files: number;
}

export interface Breadcrumb {
  id: string;
  name: string;
}

/**
 * Reads that walk the tree. Both lean on `node.path` (the ids of a node's
 * ancestors) rather than on recursion down `parentId`: over 100k nodes a prefix
 * scan counts a subtree in ~21ms where the recursive walk takes ~304ms and
 * spills to temp files under the default work_mem. docs/architecture.md has the
 * measurements.
 */
@Injectable()
export class NodeTreeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * What lives under this node, for the "N folders and M files will be deleted"
   * warning. The node itself isn't counted — the question is what goes with it.
   *
   * Sizes join this once files carry one (slice 3).
   */
  async subtreeStats(nodeId: string): Promise<SubtreeStats> {
    const node = await this.load(nodeId);

    const counts = await this.prisma.node.groupBy({
      by: ["type"],
      where: { path: { startsWith: subtreePrefix(node) } },
      _count: { _all: true },
    });

    const of = (type: "FOLDER" | "FILE") =>
      counts.find((row) => row.type === type)?._count._all ?? 0;

    return { folders: of("FOLDER"), files: of("FILE") };
  }

  /**
   * The trail from the Data Room down to (and including) this node, for
   * breadcrumbs. One query: the ancestors are already named in the path.
   */
  async ancestors(nodeId: string): Promise<Breadcrumb[]> {
    const node = await this.load(nodeId);
    const ids = ancestorIds(node.path);
    if (ids.length === 0) return [{ id: node.id, name: node.name }];

    const found = await this.prisma.node.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });

    // `in` returns rows in whatever order the database likes; the path is what
    // knows the order.
    const byId = new Map(found.map((row) => [row.id, row]));
    const trail = ids
      .map((id) => byId.get(id))
      .filter((row): row is Breadcrumb => row !== undefined);

    return [...trail, { id: node.id, name: node.name }];
  }

  private async load(nodeId: string) {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
      select: { id: true, name: true, path: true },
    });
    if (!node) throw new NodeNotFoundError(nodeId);
    return node;
  }
}
