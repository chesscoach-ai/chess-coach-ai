import "server-only";

import { createHash } from "node:crypto";
import { Pool } from "pg";

let pool: Pool | null = null;
let databaseReady: Promise<void> | null = null;

function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });
  databaseReady ??= pool
    .query(`
      CREATE TABLE IF NOT EXISTS legal_acceptances (
        user_hash TEXT NOT NULL,
        terms_version TEXT NOT NULL,
        privacy_version TEXT NOT NULL,
        source VARCHAR(30) NOT NULL,
        accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_hash, terms_version, privacy_version)
      )
    `)
    .then(() => undefined);
  return pool;
}

export async function recordLegalAcceptance(
  email: string,
  source: "credentials" | "google",
): Promise<void> {
  const database = getPool();
  if (!database) return;
  await databaseReady;
  const userHash = createHash("sha256")
    .update(email.trim().toLocaleLowerCase("fr"))
    .digest("hex");
  await database.query(
    `INSERT INTO legal_acceptances (
       user_hash, terms_version, privacy_version, source
     ) VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_hash, terms_version, privacy_version)
     DO NOTHING`,
    [
      userHash,
      process.env.LEGAL_TERMS_VERSION ??
        "draft",
      process.env.LEGAL_PRIVACY_VERSION ??
        "draft",
      source,
    ],
  );
}
