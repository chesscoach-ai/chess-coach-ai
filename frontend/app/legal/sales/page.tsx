import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/Legal/LegalPage";
import { getKnightlyPricing } from "@/lib/billing/pricing";

export const metadata: Metadata = {
  title: "Conditions d’abonnement | Knightly",
};

export default function SalesTermsPage() {
  const pricing = getKnightlyPricing();
  return (
    <LegalPage
      title="Conditions d’abonnement"
      intro="Conditions préparatoires de l’offre Analyse, inactives jusqu’au lancement commercial."
    >
      <LegalSection title="Offre et prix">
        <p>
          Knightly+ est en préparation. Les prix cibles ne deviennent des prix
          de vente qu’après alignement et validation explicite de la
          configuration Stripe. État actuel : {pricing.availability === "available" ? "offre disponible" : "paiement indisponible"}. Le multijoueur reste gratuit et aucune formule payante n’accorde d’avantage pendant une partie classée.
        </p>
      </LegalSection>
      <LegalSection title="Essai gratuit">
        <p>
          Aucun essai temporel n’est activé automatiquement. Knightly Free
          propose actuellement trois bilans découverte, la Session du jour et
          les exercices libres pour permettre d’évaluer le produit sans carte
          bancaire. Les essais historiques déjà accordés restent honorés.
        </p>
      </LegalSection>
      <LegalSection title="Paiement et renouvellement">
        <p>
          L’abonnement est payé via Stripe et renouvelé selon la périodicité
          choisie, mensuelle ou annuelle, jusqu’à sa résiliation. Le portail
          client permet de gérer le moyen de paiement et l’annulation.
        </p>
      </LegalSection>
      <LegalSection title="Résiliation et rétractation">
        <p>
          La résiliation empêche le renouvellement suivant. Les modalités
          définitives de rétractation et d’exécution immédiate du contenu
          numérique devront être validées juridiquement avant l’ouverture des
          paiements.
        </p>
      </LegalSection>
      <LegalSection title="Assistance">
        <p>
          Les coordonnées de support figurent dans les mentions légales. Toute
          contestation sera d’abord traitée amiablement ; les informations de
          médiation de la consommation seront ajoutées avant lancement.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
