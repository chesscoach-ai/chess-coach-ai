type Event = { visitorId: string; eventName: string; createdAt: string };

/** Rolling retention, based on pseudonymous app-open events already collected. */
export function retentionCohorts(events: Event[], now = Date.now()) {
  const sessions = new Set(events.filter(e => e.eventName === "daily_session_completed").map(e => e.visitorId));
  const clans = new Set(events.filter(e => e.eventName === "clan_joined" || e.eventName === "clan_created" || e.eventName === "clan_invite_accepted").map(e => e.visitorId));
  const visitors = new Set(events.filter(e => e.eventName === "app_opened").map(e => e.visitorId));
  return [
    { label: "Session terminée observée", select: (id: string) => sessions.has(id) },
    { label: "Sans session terminée observée", select: (id: string) => !sessions.has(id) },
    { label: "Adhésion Clan observée", select: (id: string) => clans.has(id) },
    { label: "Sans adhésion Clan observée", select: (id: string) => !clans.has(id) },
  ].map(({ label, select }) => {
    const ids = [...visitors].filter(select);
    const rate = (day: number) => {
      let eligible = 0; let returned = 0;
      for (const id of ids) {
        const dates = events.filter(e => e.visitorId === id && e.eventName === "app_opened").map(e => Date.parse(e.createdAt));
        const first = Math.min(...dates);
        if (now - first < day * 86400000) continue;
        eligible++;
        if (dates.some(date => date - first >= day * 86400000)) returned++;
      }
      return eligible ? Math.round(100 * returned / eligible) : null;
    };
    return { label, visitors: ids.length, d1: rate(1), d3: rate(3), d7: rate(7) };
  });
}
