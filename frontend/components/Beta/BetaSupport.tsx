"use client";

import { useEffect, useState } from "react";

import { betaTechnicalContext } from "@/lib/beta/client";

type FormKind = "feedback" | "bug" | null;

export default function BetaSupport() {
  const [kind, setKind] = useState<FormKind>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  useEffect(() => {
    if (!kind) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setKind(null); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [kind]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setStatus("sending");
    const data = new FormData(event.currentTarget);
    const payload = kind === "feedback" ? {
      ...betaTechnicalContext(), liked: String(data.get("liked") ?? ""), friction: String(data.get("friction") ?? ""),
      noxHelped: data.get("noxHelped") === "yes" ? true : data.get("noxHelped") === "no" ? false : null,
      rating: Number(data.get("rating")), comment: String(data.get("comment") ?? ""),
    } : { ...betaTechnicalContext(), comment: String(data.get("comment") ?? "") };
    try {
      const response = await fetch(kind === "feedback" ? "/api/beta/feedback" : "/api/beta/bug-reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error();
      setStatus("sent");
    } catch { setStatus("error"); }
  }

  return <>
    <div className="flex flex-wrap gap-3">
      <button type="button" onClick={() => { setKind("feedback"); setStatus("idle"); }} className="min-h-11 text-xs font-bold text-indigo-300 hover:text-white">Donner mon avis</button>
      <button type="button" onClick={() => { setKind("bug"); setStatus("idle"); }} className="min-h-11 text-xs font-bold text-amber-300 hover:text-white">Signaler un problème</button>
    </div>
    {kind && <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="beta-support-title">
      <section className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-gray-700 bg-gray-950 p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.15em] text-indigo-300">Knightly Beta</p><h2 id="beta-support-title" className="mt-1 text-2xl font-black text-white">{kind === "feedback" ? "Donner mon avis" : "Signaler un problème"}</h2></div><button type="button" aria-label="Fermer" onClick={() => setKind(null)} className="min-h-11 min-w-11 rounded-xl border border-gray-700 text-xl text-gray-300">×</button></div>
        {status === "sent" ? <div role="status" className="mt-6 rounded-2xl border border-emerald-800 bg-emerald-950/30 p-5 text-emerald-100">Merci. Ton retour aidera vraiment Nox à mieux accompagner ses prochains chevaliers.</div> :
        <form onSubmit={submit} className="mt-6 space-y-4">
          {kind === "feedback" ? <>
            <Field name="liked" label="Qu’est-ce que tu as aimé ?" required />
            <Field name="friction" label="Qu’est-ce qui t’a gêné ?" required />
            <label className="block text-sm font-bold text-gray-200">Nox t’a-t-il aidé à comprendre ?<select name="noxHelped" defaultValue="" className="mt-2 min-h-12 w-full rounded-xl border border-gray-700 bg-gray-900 px-3 text-white"><option value="">Je ne sais pas encore</option><option value="yes">Oui</option><option value="no">Non</option></select></label>
            <label className="block text-sm font-bold text-gray-200">Note globale<select name="rating" defaultValue="5" className="mt-2 min-h-12 w-full rounded-xl border border-gray-700 bg-gray-900 px-3 text-white">{[5,4,3,2,1].map((rating) => <option key={rating} value={rating}>{rating}/5</option>)}</select></label>
            <Field name="comment" label="Un dernier mot ? (facultatif)" />
          </> : <><p className="text-sm leading-6 text-gray-400">La page, la version, la plateforme et le navigateur seront joints. Aucune conversation, adresse e-mail ou partie n’est envoyée automatiquement.</p><Field name="comment" label="Que s’est-il passé ?" required minLength={10} /></>}
          {status === "error" && <p role="alert" className="text-sm text-red-300">L’envoi n’a pas abouti. Tu peux réessayer sans perdre ton texte.</p>}
          <button disabled={status === "sending"} className="min-h-12 w-full rounded-xl bg-indigo-600 px-5 font-black text-white disabled:opacity-50">{status === "sending" ? "Envoi…" : "Envoyer"}</button>
        </form>}
      </section>
    </div>}
  </>;
}

function Field({ name, label, required = false, minLength }: { name: string; label: string; required?: boolean; minLength?: number }) {
  return <label className="block text-sm font-bold text-gray-200">{label}<textarea name={name} required={required} minLength={minLength} maxLength={name === "comment" ? 1600 : 800} rows={3} className="mt-2 w-full rounded-xl border border-gray-700 bg-gray-900 p-3 text-white outline-none focus:border-indigo-500" /></label>;
}
