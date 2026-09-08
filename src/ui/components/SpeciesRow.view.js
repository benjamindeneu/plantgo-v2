// src/ui/components/SpeciesRow.view.js
import { getWikipediaImage } from "../../data/wiki.service.js";
import { t } from "../../language/i18n.js";

/** Photo lookups are shared across every row and screen on the page. */
const imageCache = new Map();

export const TIERS = ["common", "rare", "epic", "legendary"];

/** A map mission is graded before you go; a plain prediction has no grade. */
export function tierOf(species) {
  const tier = species?.grade?.tier;
  if (TIERS.includes(tier)) return tier;
  const points = Number(species?.points?.total ?? 0);
  if (points >= 1500) return "legendary";
  if (points >= 1000) return "epic";
  if (points >= 500) return "rare";
  return "common";
}

export function speciesImage(sciName) {
  if (!sciName) return Promise.resolve("");
  const key = sciName.trim().toLowerCase();
  if (!imageCache.has(key)) {
    imageCache.set(key, getWikipediaImage(sciName).then((u) => u || "").catch(() => ""));
  }
  return imageCache.get(key);
}

/**
 * One species in the sheet's list.
 *
 * Deliberately a row rather than a card: the sheet shows a third of a phone
 * screen, and a stack of full cards meant one and a half were ever visible.
 * A photo, both names and the tier fit in 76px, so a list reads as a list.
 */
export function SpeciesRow(species, { onClick } = {}) {
  const sciName = species.name || species.scientific_name || "";
  const commonName = species.vernacular_name || sciName;
  const tier = tierOf(species);
  const graded = !!species.grade;
  const chance = species.metrics?.p_mean;

  const el = document.createElement("button");
  el.type = "button";
  // Only a mission carries a grade. A prediction does not, so it gets plain
  // paper rather than a tint and a badge that would mean nothing.
  el.className = `mp-row mp-row--${tier}${graded ? " mp-row--graded" : ""}`;
  el.innerHTML = `
    <span class="mp-row__thumb"><span class="mp-row__leaf" aria-hidden="true">🌿</span></span>
    <span class="mp-row__text">
      <span class="mp-row__head">
        <span class="mp-row__name"></span>
        <span class="mp-row__badge" hidden></span>
      </span>
      <span class="mp-row__sci"></span>
      <span class="mp-row__tags"></span>
    </span>
  `;

  el.querySelector(".mp-row__name").textContent = commonName;
  el.querySelector(".mp-row__sci").textContent = sciName;

  if (graded) {
    const badge = el.querySelector(".mp-row__badge");
    badge.textContent = t(`missions.card.${tier}`);
    badge.hidden = false;
  }

  const tags = el.querySelector(".mp-row__tags");
  const tag = (text, kind) => {
    const s = document.createElement("span");
    s.className = `mp-tag mp-tag--${kind}`;
    s.textContent = text;
    tags.appendChild(s);
  };
  if (chance != null) tag(t("map.meta.chance", { pct: Math.round(chance * 100) }), "chance");
  if (species.is_flowering) tag(t("map.tag.flowering"), "pheno");
  else if (species.is_fruiting) tag(t("map.tag.fruiting"), "pheno");

  attachPhoto(el.querySelector(".mp-row__thumb"), sciName);

  if (onClick) el.addEventListener("click", () => onClick(species));
  return el;
}

/**
 * Put a species photo behind the leaf placeholder, once it has actually
 * loaded.
 *
 * The image goes into the document straight away and is faded in by CSS. It
 * used to be created detached and swapped in on `load` — but it also carried
 * `loading="lazy"`, and a lazy image that is not in the document is never in
 * the viewport either, so the browser never fetched it and `load` never fired.
 * Every thumbnail stayed a leaf.
 */
export function attachPhoto(container, sciName) {
  speciesImage(sciName).then((url) => {
    if (!url || !container.isConnected) return;
    const img = document.createElement("img");
    img.alt = "";
    img.decoding = "async";
    img.addEventListener("load", () => container.classList.add("has-photo"));
    img.addEventListener("error", () => img.remove());
    img.src = url;
    container.appendChild(img);
  });
}
