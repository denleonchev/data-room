import { Injectable } from "@nestjs/common";
import { ancestorIds, subtreePrefix, type ChildStatsDto } from "@data-room/shared";
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

@Injectable()
export class NodeTreeService {
  constructor(private readonly prisma: PrismaService) {}

  /** What lives under this node, not counting the node itself. */
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
   * What sits under each child of `parentId`, for the whole listing at once:
   * one grouped scan of the parent's subtree instead of a query per row.
   */
  async childStats(parentId: string): Promise<ChildStatsDto[]> {
    const parent = await this.load(parentId);
    const prefix = subtreePrefix(parent);

    // The ::int cast keeps Postgres on substring(string from int); untyped, it
    // picks the regex overload and quietly returns NULL for every row.
    const rows = await this.prisma.$queryRaw<
      { childId: string; type: "FOLDER" | "FILE"; count: number; bytes: bigint }[]
    >`
      SELECT split_part(substring("path" from ${prefix.length + 1}::int), '/', 1) AS "childId",
             "type",
             count(*)::int                    AS "count",
             coalesce(sum("size"), 0)::bigint AS "bytes"
      FROM "node"
      WHERE "path" LIKE ${prefix + "%"}
      GROUP BY 1, 2
    `;

    const stats = new Map<string, ChildStatsDto>();
    for (const row of rows) {
      // The children themselves land under an empty key — their own path is
      // the prefix exactly. Only what is inside them counts here.
      if (row.childId === "") continue;
      const entry = stats.get(row.childId) ?? {
        id: row.childId,
        folders: 0,
        files: 0,
        bytes: 0,
      };
      if (row.type === "FOLDER") entry.folders = row.count;
      else entry.files = row.count;
      entry.bytes += Number(row.bytes);
      stats.set(row.childId, entry);
    }
    return [...stats.values()];
  }

  /**
   * The trail down to and including this node — from the Data Room, or from
   * `stopAtPath`'s node when given (a share root, so the public viewer's
   * breadcrumb doesn't reveal anything above what was actually shared).
   */
  async ancestors(nodeId: string, stopAtPath?: string): Promise<Breadcrumb[]> {
    const node = await this.load(nodeId);
    const skip = stopAtPath ? ancestorIds(stopAtPath).length : 0;
    const ids = ancestorIds(node.path).slice(skip);
    if (ids.length === 0) return [{ id: node.id, name: node.name }];

    const found = await this.prisma.node.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });

    // `in` returns rows in whatever order it likes; the path knows the order.
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
