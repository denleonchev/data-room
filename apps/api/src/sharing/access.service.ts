import { randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { ancestorIds, isSelfOrDescendant } from "@data-room/shared";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { NodeNotFoundError } from "../nodes/node-errors";
import { UploadNotFoundError } from "../files/file-errors";
import { ShareNotFoundError } from "./share-errors";
import type { Node, Share } from "../generated/prisma/client";

// 256 bits of randomness — collision odds aren't a real-world concern here,
// unlike roomFor()'s per-user race; no retry-on-conflict needed.
const TOKEN_BYTES = 32;

// Mirrors FileService.createDownloadUrl's TTL/shape for the owner path —
// kept here rather than injected cross-module, so SharingModule only needs
// the leaf StorageModule, no cycle back through FilesModule.
const DOWNLOAD_URL_TTL_SECONDS = 60;

export interface AccessResult {
  node: Node;
  /**
   * null when the caller owns the node — the full trail to their own Data
   * Room applies as usual. Otherwise the path of the shallowest restricted
   * share that actually grants access, for the breadcrumb to stop at — the
   * same "don't reveal structure above what was shared" rule the public
   * link view already applies.
   */
  scopeRootPath: string | null;
}

@Injectable()
export class AccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** A public link's token: opaque, URL-safe, unguessable. */
  generateToken(): string {
    return randomBytes(TOKEN_BYTES).toString("base64url");
  }

  /**
   * The share a token points at, with its root node. An unknown, malformed,
   * or revoked token all answer the same error — which one it was isn't
   * information the caller gets.
   */
  async resolveToken(token: string): Promise<Share & { node: Node }> {
    const share = await this.prisma.share.findUnique({
      where: { token },
      include: { node: true },
    });
    if (!share) throw new ShareNotFoundError();
    return share;
  }

  /**
   * Loads `nodeId` only if it's the share's root or somewhere inside its
   * subtree — the walk every public read path asks before returning
   * anything. Outside the share, or gone entirely, answers the same
   * NodeNotFoundError an owner-only lookup already does elsewhere.
   */
  async loadWithinShare(share: Share & { node: Node }, nodeId: string): Promise<Node> {
    const node = await this.prisma.node.findUnique({ where: { id: nodeId } });
    if (!node || !isSelfOrDescendant(share.node, node)) {
      throw new NodeNotFoundError(nodeId);
    }
    return node;
  }

  /**
   * A folder's children within the share — folders always show, but a
   * PENDING (unconfirmed) upload never does: a visitor has no reason to see
   * a stub row for someone else's in-flight upload the way the owner does.
   */
  async listChildren(share: Share & { node: Node }, parentId: string): Promise<Node[]> {
    const parent = await this.loadWithinShare(share, parentId);
    if (parent.type === "FILE") throw new NodeNotFoundError(parentId);

    return this.prisma.node.findMany({
      where: { parentId: parent.id, OR: [{ type: "FOLDER" }, { status: "READY" }] },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
  }

  /** A short-lived download URL for a file within the share. */
  async createDownloadUrl(
    share: Share & { node: Node },
    nodeId: string,
  ): Promise<string> {
    const node = await this.loadWithinShare(share, nodeId);
    if (node.type !== "FILE" || node.status !== "READY") {
      throw new UploadNotFoundError(nodeId);
    }
    return this.storage.createSignedDownloadUrl(
      node.storageKey!,
      DOWNLOAD_URL_TTL_SECONDS,
    );
  }

  /**
   * Loads `nodeId` if the caller owns it, or if a restricted share on it or
   * any of its ancestors grants their email access — the merged rule every
   * authenticated read path beyond pure ownership needs. Compares the
   * session's email straight against `granteeEmail` rather than a stored
   * link, so an invite starts working the moment that email has a session —
   * nothing to update on sign-up.
   */
  async loadAccessible(
    user: { id: string; email: string },
    nodeId: string,
  ): Promise<AccessResult> {
    const node = await this.prisma.node.findUnique({ where: { id: nodeId } });
    if (!node) throw new NodeNotFoundError(nodeId);
    if (node.ownerId === user.id) return { node, scopeRootPath: null };

    // Ordered from the Data Room down to the node itself, so the first match
    // found is the shallowest — the most of the trail the caller is allowed
    // to see.
    const candidateIds = [...ancestorIds(node.path), node.id];
    const shares = await this.prisma.share.findMany({
      where: {
        nodeId: { in: candidateIds },
        mode: "RESTRICTED",
        granteeEmail: user.email.trim().toLowerCase(),
      },
      include: { node: { select: { path: true } } },
    });
    const shallowest = candidateIds
      .map((id) => shares.find((share) => share.nodeId === id))
      .find((share) => share !== undefined);
    if (!shallowest) throw new NodeNotFoundError(nodeId);
    return { node, scopeRootPath: shallowest.node.path };
  }
}
