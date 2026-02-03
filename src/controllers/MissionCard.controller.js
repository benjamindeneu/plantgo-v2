// src/controllers/MissionCard.controller.js
import { createMissionCardView } from "../ui/components/MissionCard.view.js";
import { Modal } from "../ui/components/Modal.js";
import { getWikipediaImage } from "../data/wiki.service.js";
import { t } from "../language/i18n.js";

/** ---- Wikipedia caching + concurrency ---- */
const wikiCache = new Map();
const MAX_CONCURRENT = 4;
let inFlight = 0;
const queue = [];

function runLimited(task) {
  return new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject });
    pump();
  });
}
function pump() {
  while (inFlight < MAX_CONCURRENT && queue.length) {
    const { task, resolve, reject } = queue.shift();
    inFlight++;
    Promise.resolve()
      .then(task)
      .then(resolve, reject)
      .finally(() => {
        inFlight--;
        pump();
      });
  }
}

export function MissionCard(species) {
  const sciName = species.name || species.scientific_name || "";
  const commonName = species.vernacular_name || t("missions.card.noCommonName");

  const heroUrl =
    species.image_url ||
    species.image ||
    (Array.isArray(species.images) && species.images[0]) ||
    "";

  const totalPoints = Number(species.points?.total ?? 0);
  const { missionLevelKey, levelClass } = getRarityFromPoints(totalPoints);

  const view = createMissionCardView({
    sciName,
    commonName,
    heroUrl,
    pointsTotal: totalPoints,
    levelClass,
    missionLevel: t(missionLevelKey),
    isFlowering: !!species.is_flowering,
    isFruiting: !!species.is_fruiting,
  });

  // points modal
  const detailObj = species.points?.detail || {};
  view.onPointsClick(() => {
    let detail =
      `<h2>${escapeHtml(t("missions.card.pointsDetails"))}</h2>` +
      `<p><small>${escapeHtml(t("missions.card.missionPrefix"))} ${escapeHtml(sciName)}</small></p>`;

    if (detailObj && typeof detailObj === "object") {
      for (const k of Object.keys(detailObj)) {
        const label = t(k); // ✅ backend sends i18n key now
        detail += `<p>${escapeHtml(label)}: ${escapeHtml(detailObj[k])} ${escapeHtml(t("missions.card.points"))}</p>`;
      }
    } else {
      detail += `<p>${escapeHtml(t("missions.card.noBreakdown"))}</p>`;
    }

    document.body.appendChild(
      Modal({ title: t("missions.card.pointsTitle"), content: detail })
    );
  });

  // wikipedia image: only if no heroUrl
  if (!heroUrl && sciName) {
    const cacheKey = sciName.trim().toLowerCase();
    if (!wikiCache.has(cacheKey)) {
      wikiCache.set(
        cacheKey,
        runLimited(async () => (await getWikipediaImage(sciName)) || "").catch(() => "")
      );
    }
    Promise.resolve(wikiCache.get(cacheKey)).then((url) => {
      if (!view.element.isConnected) return;
      view.setWikiImage(url);
    });
  }

  return view.element;
}

function getRarityFromPoints(totalPoints) {
  if (totalPoints >= 1500) return { missionLevelKey: "missions.card.legendary", levelClass: "legendary-points" };
  if (totalPoints >= 1000) return { missionLevelKey: "missions.card.epic",      levelClass: "epic-points" };
  if (totalPoints >=  500) return { missionLevelKey: "missions.card.rare",      levelClass: "rare-points" };
  return { missionLevelKey: "missions.card.common", levelClass: "common-points" };
}

function escapeHtml(s) {
  const str = String(s ?? "");
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
