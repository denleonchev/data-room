import { Injectable } from "@nestjs/common";
import {
  MAX_TREE_DEPTH,
  ROOT_PATH,
  childPath,
  depthOf,
  type CreateFolderInput,
} from "@data-room/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { Node } from "../generated/prisma/client";
import {
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
  constructor(private readonly prisma: PrismaService) {}

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

  /** Renaming works on a Data Room too — that is how a room gets its name. */
  async rename(userId: string, nodeId: string, name: string): Promise<Node> {
    await this.load(userId, nodeId);

    try {
      return await this.prisma.node.update({ where: { id: nodeId }, data: { name } });
    } catch (error) {
      if (isNameConflict(error)) throw new NodeNameConflictError(name);
      throw error;
    }
  }

  /** Deletes the node and, by cascade, everything under it. */
  async remove(userId: string, nodeId: string): Promise<void> {
    const node = await this.load(userId, nodeId);
    if (node.parentId === null) throw new RootNodeError("deleted");

    await this.prisma.node.delete({ where: { id: nodeId } });
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
