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
import { AccessService } from "../sharing/access.service";
import { UploadNotFoundError } from "./file-errors";
import type { UploadUrlDto } from "./file.dto";

// Short enough to match "short-TTL" — long enough to start loading a large
// PDF. A URL that expires while the viewer stays open is re-requested by the
// UI, not solved by a longer TTL here.
const DOWNLOAD_URL_TTL_SECONDS = 60;

@Injectable()
export class FileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nodes: NodeService,
    private readonly storage: StorageService,
    private readonly access: AccessService,
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

  /**
   * Owner or a restricted-share grantee — merged the same way every other
   * authenticated read path is (`AccessService.loadAccessible`). Public-link
   * viewers go through a separate call site
   * (`AccessService.createDownloadUrl`), since they carry a token instead of
   * a session.
   */
  async createDownloadUrl(
    user: { id: string; email: string },
    nodeId: string,
  ): Promise<string> {
    const { node } = await this.access.loadAccessible(user, nodeId);
    if (node.type !== "FILE" || node.status !== "READY") {
      throw new UploadNotFoundError(nodeId);
    }
    return this.storage.createSignedDownloadUrl(
      node.storageKey!,
      DOWNLOAD_URL_TTL_SECONDS,
    );
  }
}
