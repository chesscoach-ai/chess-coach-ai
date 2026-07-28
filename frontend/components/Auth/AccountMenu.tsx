import Link from "next/link";

import { auth, signOut } from "@/auth";

export default async function AccountMenu() {
  const session = await auth();

  if (!session?.user) {
    return (
      <Link
        href="/auth"
        className="rounded-xl border border-blue-700 bg-blue-950/30 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-900/40"
      >
        Connexion
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-300">
        {session.user.name ?? session.user.email}
      </span>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="rounded-xl border border-gray-700 px-3 py-2 text-sm text-gray-300 transition hover:bg-gray-900"
        >
          Déconnexion
        </button>
      </form>
    </div>
  );
}
