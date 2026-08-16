import { Module } from "@nestjs/common";
import { APP_GUARD, APP_PIPE } from "@nestjs/core";
import { ZodValidationPipe } from "nestjs-zod";
import { HealthController } from "./health/health.controller";
import { MeController } from "./auth/me.controller";
import { AuthGuard } from "./auth/auth.guard";
import { PrismaModule } from "./prisma/prisma.module";
import { NodesModule } from "./nodes/nodes.module";
import { FilesModule } from "./files/files.module";
import { SharingModule } from "./sharing/sharing.module";

@Module({
  imports: [PrismaModule, NodesModule, FilesModule, SharingModule],
  controllers: [HealthController, MeController],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    // Bodies and queries typed with createZodDto are parsed by their schema;
    // anything else passes through untouched.
    { provide: APP_PIPE, useClass: ZodValidationPipe },
  ],
})
export class AppModule {}
