// src/ui/components/HerbariumCard.js
import { getWikipediaImage } from "../wiki.js";

/**
 * Props shape:
 * {
 *   name: string,               // speciesName (doc id)
 *   discoveredAt: Timestamp|Date|string|null,
 *   image_url?: string|null     // optional override
 * }
 */
export function HerbariumCard({ name, discoveredAt, image_url = "" }) {
  const root = document.createElement("div");
  root.className = "herbarium-item";

  const when = formatDiscoveryDate(discoveredAt);

  root.innerHTML = `
    <div class="herbarium-card">
      <div class="herbarium-img">
        ${image_url ? `<img src="${image_url}" alt="${name}" loading="lazy">` : `<div class="wiki-skeleton"></div>`}
      </div>
      <div class="herbarium-info">
        <p class="herbarium-name"><strong>${name}</strong></p>
        <p class="herbarium-date">${when}</p>
      </div>
    </div>
  `;

  // If we don’t already have an image, fetch Wikipedia thumb for the binomial
  if (!image_url) {
    (async () => {
      const wikiImg = await getWikipediaImage(name);
      const imgWrap = root.querySelector(".herbarium-img");
      if (!imgWrap) return;
      imgWrap.innerHTML = wikiImg
        ? `<img src="${wikiImg}" alt="${name}" loading="lazy">`
        : `<div class="wiki-missing">No image</div>`;
    })();
  }

  return root;
}

function formatDiscoveryDate(ts) {
  // Supports Firestore Timestamp (toDate / seconds), Date, or ISO string
  let d = null;
  if (ts?.toDate) d = ts.toDate();
  else if (typeof ts?.seconds === "number") d = new Date(ts.seconds * 1000);
  else if (ts instanceof Date) d = ts;
  else if (typeof ts === "string" || typeof ts === "number") {
    const tmp = new Date(ts);
    if (!isNaN(tmp.getTime())) d = tmp;
  }
  if (!d) return "—";

  // Locale-friendly date+time (24h)
  return d.toLocaleString(undefined, {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}
