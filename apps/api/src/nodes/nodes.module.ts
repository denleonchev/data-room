import { Module, forwardRef } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { StorageModule } from "../storage/storage.module";
import { SharingModule } from "../sharing/sharing.module";
import { NodesController } from "./nodes.controller";
import { NodeService } from "./node.service";
import { NodeTreeService } from "./node-tree.service";

@Module({
  imports: [PrismaModule, StorageModule, forwardRef(() => SharingModule)],
  controllers: [NodesController],
  providers: [NodeService, NodeTreeService],
  exports: [NodeService, NodeTreeService],
})
export class NodesModule {}
