import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hash } from "bcryptjs";
import { Pool } from "pg";
import { recordLegalAcceptance } from "@/lib/legal/acceptanceStore";

export type StoredUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

const dataDirectory = path.join(process.cwd(), ".data");
const usersFile = path.join(dataDirectory, "users.json");
let pool: Pool | null = null;
let databaseReady: Promise<void> | null = null;

function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });

  databaseReady ??= pool
    .query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        name VARCHAR(80) NOT NULL,
        email VARCHAR(320) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    .then(() => undefined);

  return pool;
}

async function readUsers(): Promise<StoredUser[]> {
  try {
    const contents = await readFile(usersFile, "utf8");
    const value: unknown = JSON.parse(contents);
    return Array.isArray(value) ? (value as StoredUser[]) : [];
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }
    throw error;
  }
}

async function writeUsers(users: StoredUser[]): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(usersFile, JSON.stringify(users, null, 2), "utf8");
}

export async function findUserByEmail(
  email: string,
): Promise<StoredUser | null> {
  const normalizedEmail = email.trim().toLocaleLowerCase("fr");
  const database = getPool();

  if (database) {
    await databaseReady;
    const result = await database.query<{
      id: string;
      name: string;
      email: string;
      password_hash: string;
      created_at: Date;
    }>(
      `SELECT id, name, email, password_hash, created_at
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [normalizedEmail],
    );
    const user = result.rows[0];

    return user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          passwordHash: user.password_hash,
          createdAt: user.created_at.toISOString(),
        }
      : null;
  }

  const users = await readUsers();
  return users.find((user) => user.email === normalizedEmail) ?? null;
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<StoredUser> {
  const normalizedEmail = input.email.trim().toLocaleLowerCase("fr");
  const passwordHash = await hash(input.password, 12);
  const user: StoredUser = {
    id: randomUUID(),
    name: input.name.trim(),
    email: normalizedEmail,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  const database = getPool();

  if (database) {
    await databaseReady;

    try {
      await database.query(
        `INSERT INTO users (id, name, email, password_hash, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          user.id,
          user.name,
          user.email,
          user.passwordHash,
          user.createdAt,
        ],
      );
      await recordLegalAcceptance(
        user.email,
        "credentials",
      );
      return user;
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new Error("ACCOUNT_EXISTS");
      }
      throw error;
    }
  }

  const users = await readUsers();
  if (users.some((existingUser) => existingUser.email === normalizedEmail)) {
    throw new Error("ACCOUNT_EXISTS");
  }

  await writeUsers([...users, user]);
  await recordLegalAcceptance(
    user.email,
    "credentials",
  );
  return user;
}

export async function deleteUserByEmail(
  email: string,
): Promise<void> {
  const normalizedEmail =
    email.trim().toLocaleLowerCase("fr");
  const database = getPool();
  if (database) {
    await databaseReady;
    await database.query(
      "DELETE FROM users WHERE email = $1",
      [normalizedEmail],
    );
    return;
  }
  const users = await readUsers();
  await writeUsers(
    users.filter(
      (user) => user.email !== normalizedEmail,
    ),
  );
}
