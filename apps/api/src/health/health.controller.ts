import { Controller, Get } from "@nestjs/common";
import type { Health } from "@data-room/shared";

@Controller("health")
export class HealthController {
  @Get()
  check(): Health {
    return { status: "ok", service: "api" };
  }
}
