import { json, tmdbSuggestions } from './_utils.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  return json(await tmdbSuggestions(env, q));
}
