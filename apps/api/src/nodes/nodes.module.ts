import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { NodeTreeService } from "./node-tree.service";

// Reads only, and no controller yet — the routes arrive with the rest of the
// slice.
@Module({
  imports: [PrismaModule],
  providers: [NodeTreeService],
  exports: [NodeTreeService],
})
export class NodesModule {}
