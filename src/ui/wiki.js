// src/ui/wiki.js
// Fetches a thumbnail image from Wikipedia for a given title.
// Uses the REST API which supports CORS for client-side fetches.
export async function fetchWikipediaImage(title) {
  if (!title) return null;
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.thumbnail?.source || data?.originalimage?.source || null;
  } catch {
    return null;
  }
}
