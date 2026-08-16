import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NodeService } from "../nodes/node.service";
import { AccessService } from "./access.service";
import { ShareNotFoundError } from "./share-errors";
import type { Share } from "../generated/prisma/client";

@Injectable()
export class ShareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nodes: NodeService,
    private readonly access: AccessService,
  ) {}

  /**
   * Idempotent: a node already has at most one active public link — asking
   * again hands back the same one instead of minting a second.
   */
  async create(userId: string, nodeId: string): Promise<Share> {
    await this.nodes.load(userId, nodeId);

    const existing = await this.prisma.share.findFirst({
      where: { nodeId, mode: "PUBLIC_LINK" },
    });
    if (existing) return existing;

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
