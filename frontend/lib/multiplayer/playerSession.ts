import "server-only";

import { auth } from "@/auth";

export type AuthenticatedPlayer = {
  id: string;
  name: string;
};

export async function getAuthenticatedPlayer(): Promise<AuthenticatedPlayer | null> {
  const session = await auth();
  const email = session?.user?.email?.trim().toLocaleLowerCase("fr");
  const sessionName = session?.user?.name?.trim();

  if (!email) {
    return null;
  }

  return {
    id: email,
    name: sessionName || email.split("@")[0] || "Joueur",
  };
}
