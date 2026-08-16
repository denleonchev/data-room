import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { NodesController } from "./nodes.controller";
import { NodeService } from "./node.service";
import { NodeTreeService } from "./node-tree.service";

@Module({
  imports: [PrismaModule],
  controllers: [NodesController],
  providers: [NodeService, NodeTreeService],
  exports: [NodeService, NodeTreeService],
})
export class NodesModule {}
