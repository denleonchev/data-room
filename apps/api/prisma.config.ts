import "dotenv/config";
import { defineConfig } from "prisma/config";

// Connection URLs live here since Prisma 7 — the schema's datasource block only
// declares the provider. Migrate needs the non-pooled connection (DIRECT_URL);
// the runtime client uses the pooled DATABASE_URL through the driver adapter.
// The v7 CLI no longer auto-loads .env, hence the dotenv import above.
const migrateUrl = process.env.DIRECT_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Read via process.env rather than Prisma's env() helper, and omit the whole
  // datasource when unset: env() throws while the config is being loaded, which
  // breaks `prisma generate` in CI, where no database variables exist and none
  // are needed. Migrate commands still fail loudly on their own without it.
  ...(migrateUrl ? { datasource: { url: migrateUrl } } : {}),
});
