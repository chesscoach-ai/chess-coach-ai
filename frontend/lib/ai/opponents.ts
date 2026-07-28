export const AI_LEVELS = [
  {
    id: "beginner",
    label: "Débutant",
    estimatedElo: 650,
    depth: 7,
    candidateCount: 5,
    description: "Laisse passer des occasions et convient aux premières parties.",
  },
  {
    id: "casual",
    label: "Loisir",
    estimatedElo: 900,
    depth: 9,
    candidateCount: 4,
    description: "Joue des coups logiques, avec encore des erreurs régulières.",
  },
  {
    id: "club",
    label: "Club",
    estimatedElo: 1200,
    depth: 11,
    candidateCount: 3,
    description: "Développe un plan cohérent et punit les fautes simples.",
  },
  {
    id: "advanced",
    label: "Confirmé",
    estimatedElo: 1600,
    depth: 13,
    candidateCount: 2,
    description: "Calcule plus loin et défend avec davantage de précision.",
  },
  {
    id: "expert",
    label: "Expert",
    estimatedElo: 2000,
    depth: 15,
    candidateCount: 2,
    description: "Accorde très peu d’occasions et exploite les imprécisions.",
  },
  {
    id: "master",
    label: "Maître",
    estimatedElo: 2400,
    depth: 18,
    candidateCount: 1,
    description: "Choisit presque toujours la meilleure continuation calculée.",
  },
] as const;

export const AI_PERSONAS = [
  {
    id: "balanced",
    name: "Le Coach",
    subtitle: "Équilibré et pédagogique",
    description:
      "Un adversaire polyvalent qui alterne jeu actif et décisions positionnelles.",
  },
  {
    id: "capablanca",
    name: "Style Capablanca",
    subtitle: "Clarté et finales",
    description:
      "Inspiré par José Raúl Capablanca : développement naturel, simplifications saines et finales propres.",
  },
  {
    id: "tal",
    name: "Style Tal",
    subtitle: "Attaque et complications",
    description:
      "Inspiré par Mikhaïl Tal : recherche les échecs, les prises et les positions tactiques.",
  },
  {
    id: "petrosian",
    name: "Style Petrossian",
    subtitle: "Défense et prévention",
    description:
      "Inspiré par Tigran Petrossian : privilégie la sécurité, la solidité et le contrôle du contre-jeu.",
  },
  {
    id: "fischer",
    name: "Style Fischer",
    subtitle: "Précision et initiative",
    description:
      "Inspiré par Bobby Fischer : jeu direct, développement énergique et forte exigence tactique.",
  },
  {
    id: "carlsen",
    name: "Style Carlsen",
    subtitle: "Pression durable",
    description:
      "Inspiré par Magnus Carlsen : conserve les pièces actives et prolonge les positions légèrement favorables.",
  },
] as const;

export type AiLevelId = (typeof AI_LEVELS)[number]["id"];
export type AiPersonaId = (typeof AI_PERSONAS)[number]["id"];
export type PreferredColor = "white" | "black" | "random";

export function getAiLevel(id: AiLevelId) {
  return AI_LEVELS.find((level) => level.id === id) ?? AI_LEVELS[2];
}

export function getAiPersona(id: AiPersonaId) {
  return AI_PERSONAS.find((persona) => persona.id === id) ?? AI_PERSONAS[0];
}
