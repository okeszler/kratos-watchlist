// Winziger Worker, der einmal täglich den Sync-Endpunkt der Haupt-App aufruft.
// Läuft separat, weil Cron Triggers direkt an Workers hängen (nicht an Pages).

export default {
  async scheduled(event, env, ctx) {
    const res = await fetch(`${env.APP_URL}/api/sync`, { method: "POST" });
    console.log("Sync-Aufruf:", res.status, await res.text());
  },
  // Erlaubt auch manuelles Anstoßen per Browser/curl zum Testen
  async fetch(request, env) {
    const res = await fetch(`${env.APP_URL}/api/sync`, { method: "POST" });
    return new Response(await res.text(), { status: res.status });
  },
};
