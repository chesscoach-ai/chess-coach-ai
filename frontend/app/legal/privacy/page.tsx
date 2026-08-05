import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/Legal/LegalPage";
import { getLegalIdentity } from "@/lib/commercial/config";

export const metadata: Metadata = {
  title: "Confidentialité | Chess Clan",
};

export default function PrivacyPage() {
  const legal = getLegalIdentity();
  return (
    <LegalPage
      title="Politique de confidentialité"
      intro="Ce document décrit les données utilisées pour fournir le jeu, le coaching et la communauté."
    >
      <LegalSection title="Données et finalités">
        <p>
          Le compte contient notamment l’adresse e-mail, le pseudonyme et les
          informations d’authentification. Les parties, résultats, classement,
          exercices et préférences servent à fournir le service et à
          personnaliser les conseils du coach.
        </p>
        <p>
          Les données d’abonnement sont traitées avec Stripe. Chess Clan
          ne stocke pas les numéros complets de carte bancaire.
        </p>
      </LegalSection>
      <LegalSection title="Base légale et destinataires">
        <p>
          Les traitements nécessaires au compte, au jeu et à l’abonnement
          reposent sur l’exécution du contrat. La sécurité et la prévention
          des abus peuvent reposer sur l’intérêt légitime de l’éditeur.
        </p>
        <p>
          Les prestataires techniques prévus sont Render pour l’hébergement,
          Google lorsque cette connexion est choisie, Stripe pour le paiement
          et le fournisseur Web Push du navigateur pour les rappels activés.
        </p>
      </LegalSection>
      <LegalSection title="Durées et droits">
        <p>
          Les données du compte sont conservées pendant son utilisation, puis
          supprimées ou anonymisées lors de sa fermeture, sous réserve des
          obligations légales applicables aux factures et à la preuve des
          transactions.
        </p>
        <p>
          L’espace « Mes données » permet de télécharger une copie JSON et de
          demander la fermeture du compte. Pour l’accès, la rectification,
          l’opposition ou toute question :{" "}
          <a className="text-blue-300" href={`mailto:${legal.privacyEmail}`}>
            {legal.privacyEmail}
          </a>
          .
        </p>
      </LegalSection>
      <LegalSection title="Cookies et stockage local">
        <p>
          Le service utilise les traceurs strictement nécessaires à
          l’authentification, à la sécurité et aux préférences demandées. Tout
          futur outil publicitaire ou de mesure non exempté restera désactivé
          tant qu’un mécanisme de consentement conforme n’aura pas été ajouté.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
