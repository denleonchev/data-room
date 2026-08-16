import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/** Opens a route that would otherwise be closed by the global AuthGuard. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
