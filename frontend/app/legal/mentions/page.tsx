import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/Legal/LegalPage";
import { getLegalIdentity } from "@/lib/commercial/config";

export const metadata: Metadata = {
  title: "Mentions légales | Chess Clan",
};

export default function LegalNoticePage() {
  const legal = getLegalIdentity();
  return (
    <LegalPage
      title="Mentions légales"
      intro="Identification de l’éditeur et de l’hébergeur du service."
    >
      <LegalSection title="Éditeur">
        <p>{legal.entityName}</p>
        <p>{legal.address}</p>
        <p>Immatriculation : {legal.registrationNumber}</p>
        <p>Directeur de la publication : {legal.publicationDirector}</p>
        <p>
          Contact :{" "}
          <a className="text-blue-300" href={`mailto:${legal.supportEmail}`}>
            {legal.supportEmail}
          </a>
        </p>
      </LegalSection>
      <LegalSection title="Hébergement">
        <p>
          Render Services, Inc., 525 Brannan Street, Suite 300,
          San Francisco, CA 94107, États-Unis. La région technique
          configurée pour l’application est Francfort.
        </p>
      </LegalSection>
      <LegalSection title="Propriété intellectuelle">
        <p>
          Le code, les textes pédagogiques, l’interface et les éléments
          graphiques propres au service ne peuvent pas être réutilisés sans
          autorisation. Les noms de joueurs et parties historiques demeurent
          attribués à leurs auteurs et sources respectifs.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
