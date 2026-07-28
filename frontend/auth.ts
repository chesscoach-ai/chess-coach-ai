import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { z } from "zod";

import { findUserByEmail } from "@/lib/auth/userStore";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret:
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === "development"
      ? "chess-coach-local-development-secret"
      : undefined),
  pages: { signIn: "/auth" },
  providers: [
    Credentials({
      name: "Adresse e-mail",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await findUserByEmail(parsed.data.email);
        if (
          !user ||
          !(await compare(parsed.data.password, user.passwordHash))
        ) {
          return null;
        }

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
    Google,
  ],
  session: { strategy: "jwt" },
});
