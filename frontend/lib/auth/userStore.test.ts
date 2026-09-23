import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { compare } from "bcryptjs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("local credentials account store", () => {
  const originalDirectory = process.cwd();
  let temporaryDirectory = "";

  beforeAll(async () => {
    temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "chess-coach-account-"),
    );
    process.chdir(temporaryDirectory);
    vi.resetModules();
  });

  afterAll(async () => {
    process.chdir(originalDirectory);
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it("hashes credentials and keeps the account across a module reload", async () => {
    const firstStore = await import("@/lib/auth/userStore");
    const created = await firstStore.createUser({
      name: "Ada",
      email: "ADA@Example.test",
      password: "local-test-password",
    });

    expect(created.email).toBe("ada@example.test");
    expect(created.passwordHash).not.toBe("local-test-password");
    expect(await compare("local-test-password", created.passwordHash)).toBe(
      true,
    );
    expect(await compare("wrong-password", created.passwordHash)).toBe(false);

    const second = await firstStore.createUser({
      name: "Blaise",
      email: "blaise@example.test",
      password: "second-local-password",
    });
    expect(second.id).not.toBe(created.id);
    expect(second.email).not.toBe(created.email);

    const rawFile = await readFile(
      path.join(temporaryDirectory, ".data", "users.json"),
      "utf8",
    );
    expect(rawFile).not.toContain('"password":"local-test-password"');
    expect(rawFile).not.toContain("second-local-password");

    vi.resetModules();
    const reloadedStore = await import("@/lib/auth/userStore");
    const reloaded = await reloadedStore.findUserByEmail(
      "ada@example.test",
    );
    expect(reloaded).toMatchObject({
      id: created.id,
      name: "Ada",
      email: "ada@example.test",
    });
    await expect(
      reloadedStore.findUserByEmail("blaise@example.test"),
    ).resolves.toMatchObject({ id: second.id, email: second.email });
    await expect(
      reloadedStore.createUser({
        name: "Ada bis",
        email: "ada@example.test",
        password: "another-password",
      }),
    ).rejects.toThrow("ACCOUNT_EXISTS");
  });
});
