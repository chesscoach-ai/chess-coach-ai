import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/Legal/LegalPage";

export const metadata: Metadata = {
  title: "Conditions d’utilisation | Knightly",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Conditions d’utilisation"
      intro="Règles essentielles du jeu, du coaching et des espaces communautaires."
    >
      <LegalSection title="Compte et sécurité">
        <p>
          L’utilisateur fournit des informations exactes, protège son accès et
          signale toute utilisation anormale. Un seul joueur ne doit pas
          manipuler plusieurs comptes pour fausser un classement.
        </p>
      </LegalSection>
      <LegalSection title="Jeu équitable">
        <p>
          Stockfish et les aides du coach sont désactivés pendant les parties
          multijoueurs classées. L’usage d’un moteur, d’une assistance externe
          ou l’exploitation d’une faille peut entraîner l’annulation des
          résultats et la suspension du compte.
        </p>
      </LegalSection>
      <LegalSection title="Communauté">
        <p>
          Les pseudonymes, clans et échanges doivent rester respectueux.
          Harcèlement, discrimination, triche, spam et contenus illicites sont
          interdits. Même un roi maté sauvagement mérite le fair-play.
        </p>
      </LegalSection>
      <LegalSection title="Disponibilité et coaching">
        <p>
          Les évaluations échiquéennes sont pédagogiques et peuvent comporter
          des imprécisions. Le service peut évoluer ou connaître des
          interruptions de maintenance, sans garantie de progression Elo.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
