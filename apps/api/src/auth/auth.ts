import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

// Not Nest's PrismaService: this module is evaluated at import time, before the
// Nest container exists.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const cookieDomain = process.env.COOKIE_DOMAIN;

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : [],
  emailAndPassword: { enabled: true },
  // Avoids a DB round trip on every authenticated request (AuthGuard calls
  // getSession on each one) — server-side revocation can lag by up to this
  // long, acceptable since nothing here revokes sessions server-side yet.
  session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
  // Skipped rather than half-configured, so local dev runs without OAuth keys.
  socialProviders:
    googleClientId && googleClientSecret
      ? { google: { clientId: googleClientId, clientSecret: googleClientSecret } }
      : {},
  // Unset on localhost, where a dotted domain makes the browser drop the cookie.
  advanced: cookieDomain
    ? { crossSubDomainCookies: { enabled: true, domain: cookieDomain } }
    : {},
});
