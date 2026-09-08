// src/controllers/MissionMap.controller.js
import { createMissionMapView } from "../ui/components/MissionMap.view.js";
import { distanceMeters, getCurrentPosition, watchPosition } from "../data/geo.service.js";
import { fetchMapMissions, missionRasterTileUrl } from "../api/plantgo.js";
import { t } from "../language/i18n.js";

const MOVE_DEBOUNCE_MS = 500;
// Below this zoom a viewport covers more ground than a walk, so pins would be
// meaningless — the map asks the user to zoom in instead of fetching.
const MIN_FETCH_ZOOM = 13;
// How many missions — zones included — are kept in memory across a session.
const MAX_KNOWN_MISSIONS = 600;
// How far the map has to travel before it is worth asking about new ground.
// Both a share of what is already covered and a hard floor: at street zoom a
// third of the viewport is barely two blocks, and refetching that often is
// what made ordinary panning feel like the page reloading under you.
const REFETCH_FRACTION = 0.7;
const REFETCH_FLOOR_M = 450;

function uiLang() {
  return (document.documentElement.lang || "en").split("-")[0];
}

export function MissionMapPanel() {
  const view = createMissionMapView();
  view.refreshI18n();

  let userPos = null;
  let moveTimer = null;
  let inFlight = null;
  let stopWatch = () => {};
  // Centre of the last successful fetch. Refetching is gated on real distance
  // rather than rounded coordinates, so a real walk still brings in missions.
  let lastFetchAt = null;
  // Centre of the request currently out. The gate has to know about it as well
  // as about the last one that landed: a cold viewport can take half a minute,
  // and gating on `lastFetchAt` alone meant every event in that window started
  // a fresh request, which abandoned the one before it — so `lastFetchAt` was
  // never set, and the map reloaded for as long as anything nudged it.
  let pendingAt = null;
  // Only the very first load is worth a spinner in the page's sheet. Later
  // fetches are about ground the player is looking at, not the ground they are
  // standing on, so the list they are reading must not be torn down for them.
  let everLoaded = false;

  // Every mission the map has seen this session, keyed the same way the pins
  // are. The sheet below the map answers "which of these am I standing in",
  // and that question is about everywhere the player has looked — not only
  // whatever the last response happened to contain.
  const knownMissions = new Map();

  const listeners = { loading: [], missions: [], position: [], open: [] };
  const emit = (name, value) => { for (const cb of listeners[name]) cb(value); };

  function missionKey(mission) {
    return mission.id || `${mission.gbif_id}:${mission.lat}:${mission.lon}`;
  }

  async function loadMissions(vp, { force = false } = {}) {
    if (!vp) return;
    if (vp.zoom < MIN_FETCH_ZOOM) {
      view.setStatus(t("map.status.zoomIn"));
      return;
    }
    // Measured against whatever is most recently claimed for this ground, in
    // flight or landed.
    const covered = pendingAt ?? lastFetchAt;
    const threshold = Math.max(vp.radius_m * REFETCH_FRACTION, REFETCH_FLOOR_M);
    if (!force && covered && distanceMeters(covered, vp) < threshold) return;

    const token = Symbol("fetch");
    inFlight = token;
    pendingAt = { lat: vp.lat, lon: vp.lon };
    view.setStatus(t("map.status.loading"), { busy: true });
    if (!everLoaded) emit("loading", true);

    try {
      const data = await fetchMapMissions({
        lat: vp.lat,
        lon: vp.lon,
        radius_m: vp.radius_m,
        limit: 300,
        lang: uiLang(),
      });
      if (inFlight !== token) return; // a newer request already won

      lastFetchAt = { lat: vp.lat, lon: vp.lon };
      const missions = Array.isArray(data?.missions) ? data.missions : [];
      const added = view.renderPins(missions);

      for (const mission of missions) {
        knownMissions.set(missionKey(mission), mission);
      }
      // Zones are polygons, and a long walk across a city would otherwise
      // accumulate them without bound. Insertion order is oldest-first, and
      // anything dropped comes straight back the next time it is fetched.
      while (knownMissions.size > MAX_KNOWN_MISSIONS) {
        knownMissions.delete(knownMissions.keys().next().value);
      }
      emit("missions", [...knownMissions.values()]);

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
    } finally {
      // Only the request still considered current clears the gate; a superseded
      // one must not reopen it for the request that replaced it.
      if (inFlight === token) {
        pendingAt = null;
        if (!everLoaded) { everLoaded = true; emit("loading", false); }
      }
    }
  }

  /** Put one mission's zone and probability surface on the map, framed in view. */
  function showMission(mission) {
    view.selectMission(mission);
    view.showRaster(missionRasterTileUrl(mission.id));
    if (mission.extent) {
      view.showExtent(mission.extent);
    } else {
      view.showFallbackRadius(mission.lat, mission.lon);
    }
  }

  function clearMission() {
    view.selectMission(null);
    view.clearOverlays();
  }

  function setPosition(pos) {
    userPos = pos;
    view.setUserLocation(pos.lat, pos.lon);
    emit("position", pos);
  }

  async function locate({ recenter = true, force = true } = {}) {
    view.setStatus(t("map.status.locating"), { busy: true });
    try {
      const pos = await getCurrentPosition();
      setPosition({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      if (recenter) view.recenter(userPos.lat, userPos.lon);
      view.invalidate();
      await loadMissions(view.getViewport(), { force });

      // Keep following. Which missions the player is standing in changes as
      // they walk, and a list that only updated when they pressed a button
      // would be wrong exactly while they are moving towards a pin.
      stopWatch();
      stopWatch = watchPosition(setPosition, {
        onError: (e) => console.warn("[MissionMap] position watch:", e?.message || e),
      });
    } catch (e) {
      console.error("[MissionMap] locate failed:", e);
      view.setStatus(t("map.status.locateError"));
      if (!everLoaded) { everLoaded = true; emit("loading", false); }
    }
  }

  view.onPinClick((mission) => emit("open", mission));

  view.onMoveEnd((vp) => {
    clearTimeout(moveTimer);
    moveTimer = setTimeout(() => loadMissions(vp), MOVE_DEBOUNCE_MS);
  });

  // Recentring is not a reason to refetch. Ground already covered is still
  // covered after the map slides back to you, and the normal distance gate
  // will ask for anything new — so a stray tap costs a pan, not a round trip.
  view.onLocate(() => locate({ recenter: true, force: false }));
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
    stop: () => { stopWatch(); stopWatch = () => {}; },

    /** Everything the map has loaded so far, zones included. */
    getMissions: () => [...knownMissions.values()],
    getUserPosition: () => userPos,

    showMission,
    clearMission,
    setPinsVisible: (visible) => view.setPinsVisible(visible),
    recenterOnUser(zoom) {
      if (userPos) view.recenter(userPos.lat, userPos.lon, zoom);
    },

    /** Show a mission and bring its pin into view — the sheet's list does this. */
    focusMission(mission) {
      showMission(mission);
    },

    onLoading(cb) { listeners.loading.push(cb); },
    onMissions(cb) { listeners.missions.push(cb); },
    onPosition(cb) { listeners.position.push(cb); },
    /** A pin was tapped; the page decides what to show. */
    onOpen(cb) { listeners.open.push(cb); },
    onBackgroundClick(cb) { view.onBackgroundClick(cb); },
  };
}
