# Phase 2.6 — Inventaire avant correction

Audit initial réalisé depuis le commit `332835f`, avant toute modification de produit.

## P0 — blocage

- Aucun blocage général confirmé sur les surfaces accessibles en invité.

## P1 — confusion importante

1. **Jouer :** le profil invité, le rituel, un second bouton de Session et quatre choix de même poids précèdent ou concurrencent le plateau. L’action principale n’est pas assez nette.
2. **Analyse :** le bandeau invité, les nombreux blocs techniques et l’historique dans le même flux rendent la promesse pédagogique moins lisible.
3. **Progresser :** l’écran cumule plusieurs grandes cartes successives et donne une impression de dashboard malgré l’ordre produit correct.
4. **Clan vide :** créer et rejoindre ont exactement le même poids, alors que rejoindre une troupe existante est l’action la plus simple.
5. **Knightly+ :** la page explique correctement l’offre mais plusieurs cartes tarifaires et CTA concurrents peuvent donner une impression commerciale trop tôt.

## P2 — friction ou incohérence

1. La navigation principale comporte quatre libellés alors que les trois piliers demandés sont Jouer, Progresser et Clan ; l’analyse avec Nox doit rester très visible sans sembler être une quatrième application.
2. Plusieurs textes visibles emploient encore « XP », « aucun XP » ou des formulations défensives qui exposent des décisions internes au joueur.
3. Les couleurs historiques bleu, violet, cyan, vert et rouge sont parfois utilisées comme accents de section sans sémantique stable.
4. Des textes à 10 ou 11 pixels sont trop fréquents sur mobile.
5. Les états de chargement de certaines zones remplacent entièrement leur contenu et provoquent un changement de hauteur.
6. Les actions post-partie locales sont présentées en deux colonnes de même importance.
7. Le footer bêta et les retours sont utiles, mais trop présents pendant une partie sur petit écran.
8. L’ancien nom « Chess Coach » subsiste dans les métadonnées de parties d’exemple, sans être visible dans l’interface principale.

## P3 — polish

1. Harmoniser les arrondis, bordures, ombres et espacements des surfaces principales.
2. Stabiliser la taille et le placement de Nox selon son rôle.
3. Uniformiser les verbes des CTA et les états vides.
4. Décrire précisément les futurs assets définitifs de Nox.
5. Documenter les routes historiques conservées pour compatibilité.

## Parcours observés

- Invité : onboarding, Jouer, IA locale, fin de partie simulée, analyse, Session découverte, Progresser, Clan, Knightly+.
- Free : scénarios DEV de retour, Session, mission, progression, Carnet, quota et Clan.
- Plus : scénarios DEV de droits, sans achat ni changement de compte.
- Responsive : 390×844, tablette, 1366×768 et 1440×900.

Cet inventaire sert de référence « avant ». Le rapport final documente les corrections réellement retenues et les éléments laissés en dette.
