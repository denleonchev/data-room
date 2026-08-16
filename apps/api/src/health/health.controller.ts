import { Controller, Get } from "@nestjs/common";
import type { Health } from "@data-room/shared";
import { Public } from "../auth/public.decorator";

@Controller("health")
export class HealthController {
  // Must answer without a session: Railway and uptime checks call it anonymously.
  @Public()
  @Get()
  check(): Health {
    return { status: "ok", service: "api" };
  }
}
