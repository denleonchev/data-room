import { randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { isSelfOrDescendant } from "@data-room/shared";
import { PrismaService } from "../prisma/prisma.service";
import { NodeNotFoundError } from "../nodes/node-errors";
import { ShareNotFoundError } from "./share-errors";
import type { Node, Share } from "../generated/prisma/client";

// 256 bits of randomness — collision odds aren't a real-world concern here,
// unlike roomFor()'s per-user race; no retry-on-conflict needed.
const TOKEN_BYTES = 32;

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

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
}
