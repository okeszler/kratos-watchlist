import { json, errorJson } from './_utils.js';

const TMDB_BASE = 'https://api.themoviedb.org/3';

// Gleicht alle vorgemerkten Filme mit tmdb_id gegen TMDb watch/providers (AT) ab.
// Wird nicht direkt vom Client aufgerufen, sondern periodisch vom cron-worker.
export async function onRequestPost({ env }) {
  try {
    if (!env.TMDB_API_KEY) return errorJson('TMDB_API_KEY fehlt', 500);

    const { results } = await env.DB.prepare(
      "SELECT id, tmdb_id, streaming FROM filme WHERE status = 'offen' AND tmdb_id IS NOT NULL"
    ).all();

    let checked = 0;
    let updated = 0;
    let neu = 0;

    for (const row of results) {
      checked++;
      let current = '';
      try {
        const url = TMDB_BASE + '/movie/' + row.tmdb_id + '/watch/providers?api_key=' + env.TMDB_API_KEY;
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        const at = data.results && data.results.AT;
        current = ((at && at.flatrate) || []).map(function (p) { return p.provider_name; }).join(', ');
      } catch (e) {
        continue;
      }

      const before = new Set((row.streaming || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean));
      const after = new Set(current.split(',').map(function (s) { return s.trim(); }).filter(Boolean));
      const gotNew = [...after].some(function (p) { return !before.has(p); });

      if (current !== (row.streaming || '')) {
        await env.DB.prepare(
          'UPDATE filme SET streaming = ?, streaming_new = ? WHERE id = ?'
        ).bind(current, gotNew ? 1 : 0, row.id).run();
        updated++;
        if (gotNew) neu++;
      }
    }

    return json({ checked: checked, updated: updated, neu: neu });
  } catch (e) {
    return errorJson('Sync fehlgeschlagen: ' + e.message);
  }
}
