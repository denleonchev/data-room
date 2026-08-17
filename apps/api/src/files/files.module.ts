import { Module } from "@nestjs/common";
import { NodesModule } from "../nodes/nodes.module";
import { StorageModule } from "../storage/storage.module";
import { SharingModule } from "../sharing/sharing.module";
import { FilesController } from "./files.controller";
import { FileService } from "./file.service";

@Module({
  imports: [NodesModule, StorageModule, SharingModule],
  controllers: [FilesController],
  providers: [FileService],
})
export class FilesModule {}
