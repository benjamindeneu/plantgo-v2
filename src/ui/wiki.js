// src/ui/wiki.js

// Extract a clean binomial from a full scientific name
// e.g., "Bellis perennis L." -> "Bellis perennis"
// Safely ignores ranks like subsp., var., f., author strings, and parentheses.
export function getBinomialName(full) {
  if (!full || typeof full !== "string") return "";
  const cleaned = full
    .replace(/\(.*?\)/g, " ")              // remove parenthetical authors
    .replace(/[,.;]+/g, " ")               // remove punctuation
    .replace(/\b(subsp\.|ssp\.|var\.|f\.|cf\.)\b/gi, " ") // drop rank markers
    .replace(/\s+/g, " ")
    .trim();

  const parts = cleaned.split(" ");
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`;
  }
  return cleaned; // fallback
}

// Retrieve Wikipedia thumbnail for a species (OLD working approach)
export async function getWikipediaImage(speciesFullName) {
  const binomial = getBinomialName(speciesFullName);
  if (!binomial) return null;

  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
    binomial
  )}&prop=pageimages&format=json&pithumbsize=150&origin=*`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const pages = data?.query?.pages || {};
    for (const pageId in pages) {
      const thumb = pages[pageId]?.thumbnail?.source;
      if (thumb) return thumb;
    }
  } catch (err) {
    console.error("Wikipedia API error:", err);
  }
  return null;
}
