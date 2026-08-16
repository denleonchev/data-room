import { Controller, Get, Req } from "@nestjs/common";
import type { SessionUser } from "@data-room/shared";
import type { AuthenticatedRequest } from "./auth.guard";

@Controller("me")
export class MeController {
  @Get()
  me(@Req() request: AuthenticatedRequest): { user: SessionUser } {
    const { id, email, name, image, emailVerified } = request.session.user;
    return { user: { id, email, name, image: image ?? null, emailVerified } };
  }
}
