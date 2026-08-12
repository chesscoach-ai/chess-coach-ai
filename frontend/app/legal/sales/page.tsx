import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/Legal/LegalPage";
import {
  getAnalysisPriceAnnualCents,
  getAnalysisPriceMonthlyCents,
} from "@/lib/commercial/config";

export const metadata: Metadata = {
  title: "Conditions d’abonnement | Knightly",
};

export default function SalesTermsPage() {
  const currency = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
  const monthlyPrice = currency.format(
    getAnalysisPriceMonthlyCents() / 100,
  );
  const annualPrice = currency.format(
    getAnalysisPriceAnnualCents() / 100,
  );
  return (
    <LegalPage
      title="Conditions d’abonnement"
      intro="Conditions préparatoires de l’offre Analyse, inactives jusqu’au lancement commercial."
    >
      <LegalSection title="Offre et prix">
        <p>
          Knightly+ est proposé à {monthlyPrice} TTC par mois ou {annualPrice} TTC
          par an. Le multijoueur reste gratuit et aucune formule payante
          n’accorde d’avantage pendant une partie classée.
        </p>
      </LegalSection>
      <LegalSection title="Essai gratuit">
        <p>
          Chaque compte peut activer une seule période d’essai Knightly+ de 30
          jours. Elle ne demande aucun moyen de paiement et ne se transforme
          pas automatiquement en abonnement payant. Une empreinte technique du
          compte est conservée afin d’éviter le renouvellement abusif de
          l’offre après la suppression puis la recréation du même compte.
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
