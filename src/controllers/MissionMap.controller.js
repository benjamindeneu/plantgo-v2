// src/controllers/MissionMap.controller.js
import { createMissionMapView } from "../ui/components/MissionMap.view.js";
import { MissionCard } from "./MissionCard.controller.js";
import { getCurrentPosition } from "../data/geo.service.js";
import { fetchMapMissions, fetchMissionDetail, missionRasterTileUrl } from "../api/plantgo.js";
import { t } from "../language/i18n.js";

const MOVE_DEBOUNCE_MS = 400;
// Below this zoom a viewport covers more ground than a walk, so pins would be
// meaningless — the map asks the user to zoom in instead of fetching.
const MIN_FETCH_ZOOM = 13;

function uiLang() {
  return (document.documentElement.lang || "en").split("-")[0];
}

/** Metres between two coordinates (haversine). */
function distanceMeters(a, b) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Trivia arrives as either a plain string or the quiz-shaped object the
 * backend caches ({ question, choices, answer }); show the fact either way.
 */
function triviaBlock(trivia) {
  const text = typeof trivia === "string"
    ? trivia
    : (trivia?.fact || trivia?.text || trivia?.question || "");
  if (!text) return null;
  const wrap = document.createElement("div");
  wrap.className = "mission-trivia";
  const label = document.createElement("span");
  label.className = "mission-trivia__label";
  label.textContent = t("map.trivia");
  const body = document.createElement("p");
  body.textContent = text;
  wrap.append(label, body);
  return wrap;
}

export function MissionMapPanel() {
  const view = createMissionMapView();
  view.refreshI18n();

  let userPos = null;
  let moveTimer = null;
  let inFlight = null;
  let detailToken = 0;
  // Centre of the last successful fetch. Refetching is gated on real distance
  // rather than rounded coordinates, so a short drag still brings in missions.
  let lastFetchAt = null;

  async function loadMissions(vp, { force = false } = {}) {
    if (!vp) return;
    if (vp.zoom < MIN_FETCH_ZOOM) {
      view.setStatus(t("map.status.zoomIn"));
      return;
    }
    // Refetch once the view has moved by a decent fraction of what was already
    // covered — far enough to return different ground, near enough that a
    // normal drag triggers it.
    if (!force && lastFetchAt && distanceMeters(lastFetchAt, vp) < vp.radius_m * 0.35) return;

    const token = Symbol("fetch");
    inFlight = token;
    view.setStatus(t("map.status.loading"), { busy: true });

    try {
      const data = await fetchMapMissions({
        lat: vp.lat,
        lon: vp.lon,
        radius_m: vp.radius_m,
        limit: 70,
        lang: uiLang(),
      });
      if (inFlight !== token) return; // a newer request already won

      lastFetchAt = { lat: vp.lat, lon: vp.lon };
      const missions = Array.isArray(data?.missions) ? data.missions : [];
      const added = view.renderPins(missions);

      if (!missions.length) {
        view.setStatus(t("map.status.empty"));
      } else if (data.has_rasters === false) {
        view.setStatus(t("map.status.noRasters"));
      } else if (added > 0) {
        // Say so explicitly — pins arriving among dozens of others is easy to
        // miss, and silence reads as "panning does nothing".
        view.setStatus(t("map.status.added", { count: added }), { transient: true });
      } else {
        view.setStatus("");
      }
    } catch (e) {
      if (inFlight !== token) return;
      console.error("[MissionMap] fetch failed:", e);
      view.setStatus(t("map.status.loadFailed"));
    }
  }

  async function openMission(mission) {
    // Show what the pin already carries straight away; the network fills the rest.
    const card = MissionCard(mission, { showPoints: true, showMissionPrefix: true });
    view.openSheet(mission, card);

    view.setSheetMeta([]);
    // The whole probability surface, not just the extent cut out of it: it is
    // read straight off the mission id, so it lands with the sheet rather than
    // waiting on the detail round-trip.
    view.showRaster(missionRasterTileUrl(mission.id));

    if (!mission.id) {
      // No raster for this species — a radius stands in for the extent.
      view.showFallbackRadius(mission.lat, mission.lon);
      view.setSheetMeta([{ label: t("map.meta.noExtent"), tone: "warn" }]);
      return;
    }

    const token = ++detailToken;
    try {
      const detail = await fetchMissionDetail({ id: mission.id, lang: uiLang() });
      if (token !== detailToken) return; // another pin was opened meanwhile

      if (detail?.extent) {
        view.showExtent(detail.extent);
      } else {
        view.showFallbackRadius(mission.lat, mission.lon);
      }

      // Only the probability: distance and zone size were noise next to the
      // one number that says whether this is worth the walk.
      const p = detail?.metrics?.p_mean;
      view.setSheetMeta(p == null ? [] : [{ label: t("map.meta.chance", { pct: Math.round(p * 100) }) }]);

      // The card starts its own description poll on creation; injecting here
      // resolves it in one hop instead.
      if (detail?.description) card.injectDescription?.(detail.description);
      if (detail?.trivia) view.appendToSheet(triviaBlock(detail.trivia));
    } catch (e) {
      if (token !== detailToken) return;
      console.error("[MissionMap] detail failed:", e);
      view.showFallbackRadius(mission.lat, mission.lon);
      view.setSheetMeta([{ label: t("map.meta.extentFailed"), tone: "warn" }]);
    }
  }

  async function locate({ recenter = true } = {}) {
    view.setStatus(t("map.status.locating"), { busy: true });
    try {
      const pos = await getCurrentPosition();
      userPos = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      view.setUserLocation(userPos.lat, userPos.lon);
      if (recenter) view.recenter(userPos.lat, userPos.lon);
      view.invalidate();
      await loadMissions(view.getViewport(), { force: true });
    } catch (e) {
      console.error("[MissionMap] locate failed:", e);
      view.setStatus(t("map.status.locateError"));
    }
  }

  view.onPinClick((mission) => { openMission(mission); });

  view.onMoveEnd((vp) => {
    clearTimeout(moveTimer);
    moveTimer = setTimeout(() => loadMissions(vp), MOVE_DEBOUNCE_MS);
  });

  view.onSheetClose(() => {
    detailToken++; // abandon any detail response still in flight
  });

  view.onLocate(() => locate({ recenter: true }));
  view.onRefresh(() => loadMissions(view.getViewport(), { force: true }));

  document.addEventListener("i18n:changed", () => {
    view.refreshI18n();
    lastFetchAt = null; // names and descriptions are language-dependent
    loadMissions(view.getViewport(), { force: true });
  });

  return {
    element: view.element,
    start: () => locate({ recenter: true }),
    invalidate: () => view.invalidate(),
  };
}
