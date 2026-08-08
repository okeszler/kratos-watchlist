const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w342';

export function json(data, init) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    ...(init || {})
  });
}

export function errorJson(message, status) {
  return json({ error: message }, { status: status || 500 });
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function mapRow(r) {
  return {
    id: r.id,
    titel: r.titel,
    jahr: r.jahr || '',
    notiz: r.notiz || '',
    prioritaet: r.prioritaet || 'Normal',
    status: r.status || 'offen',
    hinzugefuegt: formatDate(r.hinzugefuegt),
    gesehenAm: formatDate(r.gesehen_am),
    bewertung: r.bewertung || 0,
    poster: r.poster || '',
    tmdbRating: r.tmdb_rating || 0,
    genres: r.genres || '',
    laufzeit: r.laufzeit || 0,
    beschreibung: r.beschreibung || '',
    streaming: r.streaming || '',
    rewatch: !!r.rewatch,
    tmdbId: r.tmdb_id || ''
  };
}

export async function getAllFilme(env) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM filme ORDER BY hinzugefuegt DESC'
  ).all();
  return results.map(mapRow);
}

/** Sucht einen Film bei TMDb per Titel/Jahr und liefert vollständige Metadaten (oder null). */
export async function tmdbLookup(env, titel, jahr) {
  if (!env.TMDB_API_KEY) return null;
  try {
    let url = TMDB_BASE + '/search/movie?api_key=' + env.TMDB_API_KEY + '&language=de-DE&query=' + encodeURIComponent(titel);
    if (jahr) url += '&year=' + encodeURIComponent(jahr);
    const res = await fetch(url);
    const data = await res.json();
    if (!data.results || !data.results.length) return null;
    return await tmdbDetailsById(env, data.results[0].id);
  } catch (e) {
    return null;
  }
}

/** Holt Details direkt über eine TMDb-ID (z. B. aus der Live-Suchauswahl im Formular). */
export async function tmdbDetailsById(env, tmdbId) {
  if (!env.TMDB_API_KEY) return null;
  try {
    const url = TMDB_BASE + '/movie/' + tmdbId + '?api_key=' + env.TMDB_API_KEY + '&language=de-DE&append_to_response=watch/providers';
    const res = await fetch(url);
    const detail = await res.json();
    let streaming = '';
    const at = detail['watch/providers'] && detail['watch/providers'].results && detail['watch/providers'].results.AT;
    if (at) streaming = (at.flatrate || []).map(function (p) { return p.provider_name; }).join(', ');
    return {
      jahr: (detail.release_date || '').substring(0, 4),
      poster: detail.poster_path ? TMDB_IMG + detail.poster_path : '',
      tmdbRating: detail.vote_average ? Math.round(detail.vote_average * 10) / 10 : 0,
      genres: (detail.genres || []).map(function (g) { return g.name; }).join(', '),
      laufzeit: detail.runtime || 0,
      beschreibung: detail.overview || '',
      streaming: streaming,
      tmdbId: tmdbId
    };
  } catch (e) {
    return null;
  }
}

export async function tmdbSuggestions(env, query) {
  if (!env.TMDB_API_KEY || !query || query.trim().length < 2) return [];
  try {
    const url = TMDB_BASE + '/search/movie?api_key=' + env.TMDB_API_KEY + '&language=de-DE&query=' + encodeURIComponent(query.trim());
    const res = await fetch(url);
    const data = await res.json();
    if (!data.results) return [];
    return data.results.slice(0, 6).map(function (r) {
      return {
        id: r.id,
        titel: r.title,
        jahr: (r.release_date || '').substring(0, 4),
        poster: r.poster_path ? TMDB_IMG + r.poster_path : ''
      };
    });
  } catch (e) {
    return [];
  }
}
