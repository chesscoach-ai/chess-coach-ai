"use client";

import { useActionState } from "react";

import {
  deleteAccount,
  type DeleteAccountState,
} from "@/app/account/actions";

const initialState: DeleteAccountState = {};

export default function DeleteAccountForm({
  email,
}: {
  email: string;
}) {
  const [state, action, pending] =
    useActionState(deleteAccount, initialState);
  return (
    <form action={action} className="mt-4 space-y-3">
      <label className="block text-sm text-gray-300">
        Pour confirmer, saisis{" "}
        <strong className="text-white">{email}</strong>
        <input
          name="confirmation"
          type="email"
          required
          autoComplete="off"
          className="mt-2 w-full rounded-xl border border-red-900 bg-gray-950 px-3 py-3 text-white outline-none focus:border-red-500"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-red-300">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl border border-red-800 px-4 py-3 text-sm font-bold text-red-200 transition hover:bg-red-950/50 disabled:opacity-50"
      >
        {pending
          ? "Suppression en cours…"
          : "Supprimer définitivement mon compte"}
      </button>
    </form>
  );
}
