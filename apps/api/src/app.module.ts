import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { HealthController } from "./health/health.controller";
import { MeController } from "./auth/me.controller";
import { AuthGuard } from "./auth/auth.guard";
import { PrismaModule } from "./prisma/prisma.module";
import { NodesModule } from "./nodes/nodes.module";

@Module({
  imports: [PrismaModule, NodesModule],
  controllers: [HealthController, MeController],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
