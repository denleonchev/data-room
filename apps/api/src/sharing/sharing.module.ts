import { Module, forwardRef } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { StorageModule } from "../storage/storage.module";
import { NodesModule } from "../nodes/nodes.module";
import { AccessService } from "./access.service";
import { ShareService } from "./share.service";
import { SharesController } from "./shares.controller";
import { PublicSharesController } from "./public-shares.controller";

@Module({
  imports: [PrismaModule, StorageModule, forwardRef(() => NodesModule)],
  controllers: [SharesController, PublicSharesController],
  providers: [AccessService, ShareService],
  exports: [AccessService, ShareService],
})
export class SharingModule {}
