import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { NodeTreeService } from "./node-tree.service";

@Module({
  imports: [PrismaModule],
  providers: [NodeTreeService],
  exports: [NodeTreeService],
})
export class NodesModule {}
