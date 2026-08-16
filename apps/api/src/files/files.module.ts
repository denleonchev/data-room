import { Module } from "@nestjs/common";
import { NodesModule } from "../nodes/nodes.module";
import { StorageModule } from "../storage/storage.module";
import { FilesController } from "./files.controller";
import { FileService } from "./file.service";

@Module({
  imports: [NodesModule, StorageModule],
  controllers: [FilesController],
  providers: [FileService],
})
export class FilesModule {}
