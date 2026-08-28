import "server-only";

import { Pool } from "pg";

export const REQUIRED_DATABASE_REVISION = "0006_beta_observability";

let sharedPool: Pool | null = null;
let migrationCheck: Promise<void> | null = null;

export function getPostgresPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  sharedPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });
  return sharedPool;
}

export function ensureDatabaseMigrations(pool: Pool): Promise<void> {
  migrationCheck ??= pool
    .query<{ version_num: string }>(
      "SELECT version_num FROM alembic_version LIMIT 1",
    )
    .then((result) => {
      const current = result.rows[0]?.version_num;
      if (current !== REQUIRED_DATABASE_REVISION) {
        throw new Error(
          `DATABASE_MIGRATION_REQUIRED:${current ?? "none"}->${REQUIRED_DATABASE_REVISION}`,
        );
      }
    })
    .catch((error: unknown) => {
      migrationCheck = null;
      if (
        error instanceof Error &&
        error.message.startsWith("DATABASE_MIGRATION_REQUIRED:")
      ) {
        throw error;
      }
      throw new Error("DATABASE_MIGRATION_STATUS_UNAVAILABLE", {
        cause: error,
      });
    });
  return migrationCheck;
}
