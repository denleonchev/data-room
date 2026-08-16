import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

// Global so later slices can inject PrismaService without importing this module
// into every feature module.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
