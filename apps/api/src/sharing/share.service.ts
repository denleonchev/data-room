import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NodeService } from "../nodes/node.service";
import { AccessService } from "./access.service";
import { SelfInviteError, ShareNotFoundError } from "./share-errors";
import type { Node, Share } from "../generated/prisma/client";

@Injectable()
export class ShareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nodes: NodeService,
    private readonly access: AccessService,
  ) {}

  /**
   * Idempotent: a node already has at most one active public link, or one
   * active restricted share per grantee email — asking again hands back the
   * same row instead of minting a second.
   */
  async create(
    user: { id: string; email: string },
    nodeId: string,
    granteeEmail?: string,
  ): Promise<Share> {
    await this.nodes.load(user.id, nodeId);

    if (granteeEmail) {
      if (granteeEmail === user.email.trim().toLowerCase()) throw new SelfInviteError();

      const existingInvite = await this.prisma.share.findFirst({
        where: { nodeId, mode: "RESTRICTED", granteeEmail },
      });
      if (existingInvite) return existingInvite;

      return this.prisma.share.create({
        data: { nodeId, mode: "RESTRICTED", role: "VIEWER", granteeEmail },
      });
    }

    const existingLink = await this.prisma.share.findFirst({
      where: { nodeId, mode: "PUBLIC_LINK" },
    });
    if (existingLink) return existingLink;

    return this.prisma.share.create({
      data: {
        nodeId,
        mode: "PUBLIC_LINK",
        role: "VIEWER",
        token: this.access.generateToken(),
      },
    });
  }

  async listForNode(userId: string, nodeId: string): Promise<Share[]> {
    await this.nodes.load(userId, nodeId);
    return this.prisma.share.findMany({
      where: { nodeId },
      orderBy: { createdAt: "desc" },
    });
  }

  /** The top-level nodes restricted-shared directly with this email. */
  async listSharedWithMe(email: string): Promise<Node[]> {
    const shares = await this.prisma.share.findMany({
      where: { mode: "RESTRICTED", granteeEmail: email.trim().toLowerCase() },
      include: { node: true },
      orderBy: { createdAt: "desc" },
    });
    return shares.map((share) => share.node);
  }

  /** `Share` carries no ownerId of its own — ownership is checked through its node. */
  async revoke(userId: string, shareId: string): Promise<void> {
    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
      include: { node: true },
    });
    if (!share || share.node.ownerId !== userId) throw new ShareNotFoundError();

    await this.prisma.share.delete({ where: { id: shareId } });
  }
}
