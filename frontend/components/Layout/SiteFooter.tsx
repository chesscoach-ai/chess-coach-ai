import Link from "next/link";
import BetaSupport from "@/components/Beta/BetaSupport";
import { KNIGHTLY_BETA_VERSION } from "@/lib/beta/constants";

const links = [
  { href: "/legal/mentions", label: "Mentions légales" },
  { href: "/legal/privacy", label: "Confidentialité" },
  { href: "/legal/terms", label: "Conditions d’utilisation" },
  { href: "/legal/sales", label: "Abonnement" },
  { href: "/account", label: "Mes données" },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-gray-800 bg-gray-950 px-4 py-6 text-gray-500">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 text-xs sm:flex-row sm:items-center sm:justify-between">
        <div><p>© {new Date().getFullYear()} Knightly · Les échecs, sérieusement… sans se prendre trop au sérieux.</p><p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-gray-600">Beta {KNIGHTLY_BETA_VERSION}</p></div>
        <BetaSupport />
        <nav
          aria-label="Informations légales"
          className="flex flex-wrap gap-x-4 gap-y-2"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-gray-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
