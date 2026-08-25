"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="flex min-h-[70vh] items-center justify-center bg-gray-950 p-5 text-white"><section role="alert" className="max-w-lg rounded-3xl border border-amber-800 bg-gray-900 p-7 text-center"><p className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">Knightly Beta</p><h1 className="mt-2 text-2xl font-black">Un rouage du château s’est bloqué</h1><p className="mt-3 text-sm leading-6 text-gray-300">Tes données ne sont pas effacées. Tu peux relancer cet écran ou revenir à l’échiquier.</p><div className="mt-5 flex justify-center gap-2"><button onClick={reset} className="rounded-xl bg-indigo-600 px-4 py-3 font-bold">Réessayer</button><Link href="/" className="rounded-xl border border-gray-700 px-4 py-3 font-bold">Revenir à Jouer</Link></div></section></main>;
}
