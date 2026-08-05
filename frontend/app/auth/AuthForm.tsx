"use client";

import { useActionState, useState, type ReactNode } from "react";

import {
  login,
  register,
  type AuthActionState,
} from "@/app/auth/actions";

const initialState: AuthActionState = {};

export default function AuthForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginState, loginAction, loginPending] = useActionState(
    login,
    initialState,
  );
  const [registerState, registerAction, registerPending] = useActionState(
    register,
    initialState,
  );
  const state = mode === "login" ? loginState : registerState;
  const pending = mode === "login" ? loginPending : registerPending;

  return (
    <div>
      <div className="grid grid-cols-2 rounded-xl border border-gray-800 bg-gray-950 p-1">
        <ModeButton
          active={mode === "login"}
          onClick={() => setMode("login")}
        >
          Se connecter
        </ModeButton>
        <ModeButton
          active={mode === "register"}
          onClick={() => setMode("register")}
        >
          Créer un compte
        </ModeButton>
      </div>

      <form
        action={mode === "login" ? loginAction : registerAction}
        className="mt-6 space-y-4"
      >
        {mode === "register" && (
          <Field
            label="Prénom ou pseudonyme"
            name="name"
            type="text"
            autoComplete="name"
          />
        )}
        <Field
          label="Adresse e-mail"
          name="email"
          type="email"
          autoComplete="email"
        />
        <Field
          label="Mot de passe"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
        {mode === "register" && (
          <>
            <Field
              label="Confirmer le mot de passe"
              name="confirmation"
              type="password"
              autoComplete="new-password"
            />
            <label className="flex items-start gap-3 text-xs leading-5 text-gray-400">
              <input
                type="checkbox"
                name="terms"
                value="accepted"
                required
                className="mt-1"
              />
              <span>
                J’accepte les{" "}
                <a className="text-blue-300" href="/legal/terms">
                  conditions d’utilisation
                </a>{" "}
                et j’ai lu la{" "}
                <a className="text-blue-300" href="/legal/privacy">
                  politique de confidentialité
                </a>
                .
              </span>
            </label>
          </>
        )}

        {state.error && (
          <p
            role="alert"
            className="rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-200"
          >
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
        >
          {pending
            ? "Veuillez patienter…"
            : mode === "login"
              ? "Se connecter"
              : "Créer mon compte"}
        </button>
      </form>
    </div>
  );
}

function Field(props: {
  label: string;
  name: string;
  type: "text" | "email" | "password";
  autoComplete: string;
}) {
  return (
    <label className="block text-sm font-medium text-gray-200">
      {props.label}
      <input
        {...props}
        required
        minLength={props.type === "password" ? 8 : undefined}
        className="mt-2 w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-3 text-white outline-none transition focus:border-blue-500"
      />
    </label>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-lg px-3 py-2 text-sm font-semibold transition",
        active
          ? "bg-gray-800 text-white"
          : "text-gray-500 hover:text-gray-300",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
