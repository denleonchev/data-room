import { Injectable, Logger } from "@nestjs/common";
import {
  MAX_TREE_DEPTH,
  ROOT_PATH,
  childPath,
  depthOf,
  isNoopMove,
  isSelfOrDescendant,
  subtreePrefix,
  type CreateFolderInput,
  type UpdateNodeInput,
} from "@data-room/shared";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import type { Node } from "../generated/prisma/client";
import {
  NodeMoveIntoOwnSubtreeError,
  NodeNameConflictError,
  NodeNotFoundError,
  RootNodeError,
  TreeTooDeepError,
  isNameConflict,
  isUniqueViolation,
} from "./node-errors";

const DEFAULT_ROOM_NAME = "My Data Room";

// A pending upload that never completed (tab closed, network died) shouldn't
// accumulate forever. Swept lazily here rather than on a schedule — no cron
// dependency, and this is the one place "what's in this folder" is already
// decided.
const ORPHANED_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class NodeService {
  private readonly logger = new Logger(NodeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * The caller's Data Room, created on first use. Lazily rather than on sign-up
   * so accounts that predate this code get one too.
   */
  async roomFor(userId: string): Promise<Node> {
    const existing = await this.findRoom(userId);
    if (existing) return existing;

    try {
      return await this.prisma.node.create({
        data: {
          type: "FOLDER",
          name: DEFAULT_ROOM_NAME,
          ownerId: userId,
          parentId: null,
          path: ROOT_PATH,
        },
      });
    } catch (error) {
      // Two tabs signing in at once: the partial unique index picks a winner.
      if (!isUniqueViolation(error)) throw error;
      const room = await this.findRoom(userId);
      if (!room) throw error;
      return room;
    }
  }

  /** Children of a folder — of the caller's Data Room when no parent is given. */
  async list(userId: string, parentId?: string): Promise<Node[]> {
    const parent = parentId
      ? await this.load(userId, parentId)
      : await this.roomFor(userId);

    await this.prisma.node.deleteMany({
      where: {
        parentId: parent.id,
        type: "FILE",
        status: "PENDING",
        createdAt: { lt: new Date(Date.now() - ORPHANED_UPLOAD_TTL_MS) },
      },
    });

    return this.prisma.node.findMany({
      where: { parentId: parent.id },
      // Folders first, then by name: the order the list view renders in.
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
  }

  async createFolder(
    userId: string,
    { parentId, name }: CreateFolderInput,
  ): Promise<Node> {
    const parent = await this.load(userId, parentId);
    if (parent.type === "FILE") throw new NodeNotFoundError(parentId);

    const path = childPath(parent);
    if (depthOf(path) > MAX_TREE_DEPTH) throw new TreeTooDeepError();

    try {
      return await this.prisma.node.create({
        data: { type: "FOLDER", name, ownerId: userId, parentId, path },
      });
    } catch (error) {
      if (isNameConflict(error)) throw new NodeNameConflictError(name);
      throw error;
    }
  }

  /** Renames, moves, or both in one PATCH — the folder picker and the inline
   *  rename field both post here. */
  async update(userId: string, nodeId: string, input: UpdateNodeInput): Promise<Node> {
    let node = await this.load(userId, nodeId);
    if (input.name !== undefined) node = await this.rename(node, input.name);
    if (input.parentId !== undefined)
      node = await this.move(userId, node, input.parentId);
    return node;
  }

  /** Renaming works on a Data Room too — that is how a room gets its name. */
  private async rename(node: Node, name: string): Promise<Node> {
    try {
      return await this.prisma.node.update({ where: { id: node.id }, data: { name } });
    } catch (error) {
      if (isNameConflict(error)) throw new NodeNameConflictError(name);
      throw error;
    }
  }

  /**
   * Moves `node` under `destinationId`. A no-op move (already there) is
   * silently a success; everything else that could make the tree
   * inconsistent — moving the Data Room, moving into a file, moving into
   * your own subtree, nesting past the depth cap — is rejected before any
   * write. The moved node's own row and every descendant's `path` shift in
   * one transaction, since a descendant's ancestry has to move with it.
   */
  private async move(userId: string, node: Node, destinationId: string): Promise<Node> {
    if (node.parentId === null) throw new RootNodeError("moved");
    if (isNoopMove(node, destinationId)) return node;

    const destination = await this.load(userId, destinationId);
    if (destination.type === "FILE") throw new NodeNotFoundError(destinationId);
    if (isSelfOrDescendant(node, destination)) throw new NodeMoveIntoOwnSubtreeError();

    const newPath = childPath(destination);
    if (depthOf(newPath) > MAX_TREE_DEPTH) throw new TreeTooDeepError();

    const oldPrefix = subtreePrefix(node);
    const newPrefix = subtreePrefix({ id: node.id, path: newPath });

    try {
      const [updated] = await this.prisma.$transaction([
        this.prisma.node.update({
          where: { id: node.id },
          data: { parentId: destinationId, path: newPath },
        }),
        this.prisma.$executeRaw`
          UPDATE "node" SET "path" = ${newPrefix} || substring("path" from ${oldPrefix.length + 1})
          WHERE "path" LIKE ${oldPrefix + "%"}
        `,
      ]);
      return updated;
    } catch (error) {
      if (isNameConflict(error)) throw new NodeNameConflictError(node.name);
      throw error;
    }
  }

  /**
   * Deletes the node and, by cascade, everything under it. Any Storage
   * object(s) it owned are cleaned up after — best-effort, since a Storage
   * hiccup shouldn't turn an already-succeeded delete into a 500.
   */
  async remove(userId: string, nodeId: string): Promise<void> {
    const node = await this.load(userId, nodeId);
    if (node.parentId === null) throw new RootNodeError("deleted");

    const storageKeys = await this.storageKeysUnder(node);
    await this.prisma.node.delete({ where: { id: nodeId } });

    if (storageKeys.length > 0) {
      await this.storage
        .deleteObjects(storageKeys)
        .catch((error: unknown) =>
          this.logger.warn(`Storage cleanup failed for node ${nodeId}: ${error}`),
        );
    }
  }

  /** The Storage object keys under `node` — itself if it's a file, its
   *  file descendants if it's a folder. */
  private async storageKeysUnder(node: Node): Promise<string[]> {
    if (node.type === "FILE") return node.storageKey ? [node.storageKey] : [];

    const files = await this.prisma.node.findMany({
      where: {
        path: { startsWith: subtreePrefix(node) },
        type: "FILE",
        storageKey: { not: null },
      },
      select: { storageKey: true },
    });
    return files.map((file) => file.storageKey!);
  }

  /**
   * Loads a node the caller owns. Someone else's node is reported as missing:
   * telling them it exists is already more than they should know.
   */
  async load(userId: string, nodeId: string): Promise<Node> {
    const node = await this.prisma.node.findFirst({
      where: { id: nodeId, ownerId: userId },
    });
    if (!node) throw new NodeNotFoundError(nodeId);
    return node;
  }

  private findRoom(userId: string): Promise<Node | null> {
    return this.prisma.node.findFirst({
      where: { ownerId: userId, parentId: null },
    });
  }
}
