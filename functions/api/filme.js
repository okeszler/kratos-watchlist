import { json, errorJson, getAllFilme, tmdbLookup, tmdbDetailsById } from './_utils.js';

export async function onRequestGet({ env }) {
  try {
    return json(await getAllFilme(env));
  } catch (e) {
    return errorJson('Konnte Filme nicht laden: ' + e.message);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const titel = String(body.titel || '').trim();
    if (!titel) return errorJson('Titel fehlt', 400);

    let meta = null;
    if (body.tmdbId) {
      meta = await tmdbDetailsById(env, body.tmdbId);
    } else {
      meta = await tmdbLookup(env, titel, body.jahr);
    }

    const id = crypto.randomUUID();
    const jahr = (body.jahr && String(body.jahr).trim()) || (meta ? meta.jahr : '') || '';

    await env.DB.prepare(
      `INSERT INTO filme
        (id, titel, jahr, notiz, prioritaet, status, hinzugefuegt, bewertung,
         poster, tmdb_rating, genres, laufzeit, beschreibung, streaming, rewatch, tmdb_id)
       VALUES (?, ?, ?, ?, ?, 'offen', ?, NULL, ?, ?, ?, ?, ?, ?, 0, ?)`
    ).bind(
      id,
      titel,
      jahr,
      String(body.notiz || '').trim(),
      body.prioritaet === 'Hoch' ? 'Hoch' : 'Normal',
      new Date().toISOString(),
      meta ? meta.poster : '',
      meta ? meta.tmdbRating : null,
      meta ? meta.genres : '',
      meta ? meta.laufzeit : null,
      meta ? meta.beschreibung : '',
      meta ? meta.streaming : '',
      meta ? meta.tmdbId : (body.tmdbId || null)
    ).run();

    return json(await getAllFilme(env));
  } catch (e) {
    return errorJson('Konnte Film nicht speichern: ' + e.message);
  }
}
