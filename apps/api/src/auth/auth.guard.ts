import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { fromNodeHeaders } from "better-auth/node";
import type { Request } from "express";
import { auth } from "./auth";
import { IS_PUBLIC_KEY } from "./public.decorator";

export type AuthenticatedRequest = Request & {
  session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
};

// Registered globally (see AppModule), so every route is closed unless it carries
// @Public(). Better Auth's own routes never reach this guard — their handler is
// mounted as middleware, ahead of the Nest router.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) throw new UnauthorizedException();

    (request as AuthenticatedRequest).session = session;
    return true;
  }
}
