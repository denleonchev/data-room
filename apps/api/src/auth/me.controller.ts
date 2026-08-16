import { Controller, Get, Req } from "@nestjs/common";
import type { SessionUser } from "@data-room/shared";
import type { AuthenticatedRequest } from "./auth.guard";

@Controller("me")
export class MeController {
  // The global AuthGuard has already rejected sessionless requests with 401 and
  // put the session on the request, so this only reshapes it.
  @Get()
  me(@Req() request: AuthenticatedRequest): { user: SessionUser } {
    const { id, email, name, image, emailVerified } = request.session.user;
    return { user: { id, email, name, image: image ?? null, emailVerified } };
  }
}
