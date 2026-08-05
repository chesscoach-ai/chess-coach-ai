const REMINDER_MESSAGES = [
  "Ton roi commence à s’ennuyer. Cinq minutes d’entraînement avant qu’il ne se fasse mater sauvagement ?",
  "Ta série est encore en vie. Évitons le gambit douteux du « je ferai ça demain ».",
  "Alerte échiquéenne : aucun neurone tactique n’a encore été sacrifié aujourd’hui.",
  "Même un pion trouve le temps d’avancer. Ta mission du jour t’attend.",
  "Le coach a préparé une position croustillante. Promis, aucun roi n’a été maltraité pendant la préparation.",
] as const;

export function getReminderMessage(
  date = new Date(),
): string {
  const seed =
    date.getFullYear() * 372 +
    (date.getMonth() + 1) * 31 +
    date.getDate();
  return REMINDER_MESSAGES[
    seed % REMINDER_MESSAGES.length
  ];
}

export function getCheckmateAside(
  playerWon: boolean,
): string {
  return playerWon
    ? "Le roi adverse vient d’être maté sauvagement. Avec élégance, bien sûr."
    : "Ton roi s’est fait mater sauvagement. On respire, puis on va voir le bilan.";
}
