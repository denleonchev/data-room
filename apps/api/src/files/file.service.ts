import { Injectable } from "@nestjs/common";
import {
  MAX_TREE_DEPTH,
  childPath,
  depthOf,
  type CreateFileUploadInput,
} from "@data-room/shared";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import type { Node } from "../generated/prisma/client";
import {
  NodeNameConflictError,
  NodeNotFoundError,
  TreeTooDeepError,
  isNameConflict,
} from "../nodes/node-errors";
import { NodeService } from "../nodes/node.service";
import { UploadNotFoundError } from "./file-errors";
import type { UploadUrlDto } from "./file.dto";

@Injectable()
export class FileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nodes: NodeService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Creates the pending row and asks Storage for a URL the browser PUTs to
   * directly. The row's own id doubles as the Storage object key — Prisma
   * generates it on insert, so storageKey is set in a follow-up update
   * rather than computed up front.
   */
  async createUploadUrl(
    userId: string,
    { parentId, name, size, mimeType }: CreateFileUploadInput,
  ): Promise<UploadUrlDto> {
    const parent = await this.nodes.load(userId, parentId);
    if (parent.type === "FILE") throw new NodeNotFoundError(parentId);

    const path = childPath(parent);
    if (depthOf(path) > MAX_TREE_DEPTH) throw new TreeTooDeepError();

    let created: Node;
    try {
      created = await this.prisma.node.create({
        data: {
          type: "FILE",
          name,
          ownerId: userId,
          parentId,
          path,
          size,
          mimeType,
          status: "PENDING",
        },
      });
    } catch (error) {
      if (isNameConflict(error)) throw new NodeNameConflictError(name);
      throw error;
    }

    await this.prisma.node.update({
      where: { id: created.id },
      data: { storageKey: created.id },
    });

    const signedUrl = await this.storage.createSignedUploadUrl(created.id);
    return { nodeId: created.id, signedUrl };
  }

  /**
   * Confirms the PUT actually landed and records the real byte count — never
   * the client-reported one past this point. Idempotent: a retried confirm
   * for an already-ready file just returns it.
   */
  async completeUpload(userId: string, nodeId: string): Promise<Node> {
    const node = await this.nodes.load(userId, nodeId);
    if (node.type !== "FILE") throw new NodeNotFoundError(nodeId);
    if (node.status === "READY") return node;

    const size = await this.storage.getUploadedSize(node.storageKey!);
    if (size === null) throw new UploadNotFoundError(nodeId);

    return this.prisma.node.update({
      where: { id: nodeId },
      data: { status: "READY", size },
    });
  }
}
