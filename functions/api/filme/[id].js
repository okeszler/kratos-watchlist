import { json, errorJson, getAllFilme } from '../_utils.js';

export async function onRequestPatch({ request, env, params }) {
  try {
    const id = params.id;
    const body = await request.json();

    if (body.action === 'gesehen') {
      await env.DB.prepare(
        'UPDATE filme SET status = ?, gesehen_am = ?, bewertung = ?, rewatch = 0 WHERE id = ?'
      ).bind('gesehen', new Date().toISOString(), body.bewertung || null, id).run();
    } else if (body.action === 'offen') {
      await env.DB.prepare(
        'UPDATE filme SET status = ?, gesehen_am = NULL, bewertung = NULL, rewatch = 0 WHERE id = ?'
      ).bind('offen', id).run();
    } else if (body.action === 'rewatch') {
      await env.DB.prepare(
        'UPDATE filme SET status = ?, rewatch = 1 WHERE id = ?'
      ).bind('offen', id).run();
    } else if (body.action === 'ack_streaming') {
      await env.DB.prepare(
        'UPDATE filme SET streaming_new = 0 WHERE id = ?'
      ).bind(id).run();
    } else {
      return errorJson('Unbekannte Aktion', 400);
    }

    return json(await getAllFilme(env));
  } catch (e) {
    return errorJson('Konnte Film nicht aktualisieren: ' + e.message);
  }
}

export async function onRequestDelete({ env, params }) {
  try {
    await env.DB.prepare('DELETE FROM filme WHERE id = ?').bind(params.id).run();
    return json(await getAllFilme(env));
  } catch (e) {
    return errorJson('Konnte Film nicht löschen: ' + e.message);
  }
}
