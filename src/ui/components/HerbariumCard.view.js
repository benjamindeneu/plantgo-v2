// src/ui/components/HerbariumCard.view.js
import { t } from "../../language/i18n.js";

export function createHerbariumCardView({ name, discoveredAt, image_url = "" }) {
  const root = document.createElement("div");
  root.className = "herbarium-item";

  const when = formatDiscoveryDate(discoveredAt);

  root.innerHTML = `
    <div class="herbarium-card">
      <div class="herbarium-img">
        ${image_url
          ? `<img src="${image_url}" alt="${escapeHtml(name)}" loading="lazy">`
          : `<div class="wiki-skeleton"></div>`}
      </div>
      <div class="herbarium-info">
        <p class="herbarium-name"><strong>${escapeHtml(name)}</strong></p>
        <p class="herbarium-date">${escapeHtml(when)}</p>
      </div>
    </div>
  `;

  const imgWrap = root.querySelector(".herbarium-img");
  const dateEl = root.querySelector(".herbarium-date");

  function refreshI18n() {
    // update date formatting when language changes
    if (dateEl) dateEl.textContent = formatDiscoveryDate(discoveredAt);
  }

  // Optional: live-update date strings when language changes, this is done at page level to avoid too many updates
  // document.addEventListener("i18n:changed", refreshI18n);

  return {
    element: root,

    setImage(url) {
      if (!imgWrap) return;

      if (url) {
        imgWrap.innerHTML = `<img src="${url}" alt="${escapeHtml(name)}" loading="lazy">`;
      } else {
        imgWrap.innerHTML = `<div class="wiki-missing">${escapeHtml(t("herbarium.card.noImage"))}</div>`;
      }
    },

    refreshI18n,
  };
}

function formatDiscoveryDate(ts) {
  let d = null;
  if (ts?.toDate) d = ts.toDate();
  else if (typeof ts?.seconds === "number") d = new Date(ts.seconds * 1000);
  else if (ts instanceof Date) d = ts;
  else if (typeof ts === "string" || typeof ts === "number") {
    const tmp = new Date(ts);
    if (!isNaN(tmp.getTime())) d = tmp;
  }
  if (!d) return t("herbarium.card.unknownDate");

  // Use app language for month names etc.
  const locale = document.documentElement.lang || undefined;

  return d.toLocaleString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// tiny helper to avoid HTML injection (names can contain quotes, etc.)
function escapeHtml(s) {
  const str = String(s ?? "");
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
