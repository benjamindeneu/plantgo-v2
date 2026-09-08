// src/controllers/MapPage.controller.js
import { createMapPageView } from "../ui/components/MapPage.view.js";
import { MissionMapPanel } from "./MissionMap.controller.js";
import { IdentifyPanel } from "./IdentifyPanel.controller.js";
import { SpeciesRow } from "../ui/components/SpeciesRow.view.js";
import { SpeciesDetail } from "../ui/components/SpeciesDetail.view.js";
import { missionsAtPoint } from "../data/extent.geo.js";
import { distanceMeters, getCurrentPosition } from "../data/geo.service.js";
import { fetchPredictions, fetchMissionDetail } from "../api/plantgo.js";

// How far the player can walk before the "around me" predictions are about
// somewhere else. The model resolves at a few hundred metres.
const AROUND_STALE_M = 400;
// Close enough to read the marker, wide enough to still see where you are.
const AROUND_ZOOM = 17;

function uiLang() {
  return (document.documentElement.lang || "en").split("-")[0];
}

/**
 * The beta map page: the map, the sheet under it, and the camera.
 *
 * The two tabs answer different questions and so are loaded differently.
 * "Missions" is about where the player is standing, and its list is derived —
 * the map already holds every mission and its zone, so the list is a
 * point-in-polygon filter that reruns on every GPS fix and costs no request.
 * "Around you" is a reading taken at one point, so it is fetched, the pins come
 * off the map, and the map returns to the player.
 */
export function MapPage() {
  const view = createMapPageView();
  const map = MissionMapPanel();
  view.mapSlot.appendChild(map.element);

  let missions = [];
  let position = null;
  let missionsLoading = true;
  let aroundLoaded = false;
  let aroundLoading = false;
  let aroundSpecies = [];
  let aroundAt = null;   // where the predictions on screen were fetched
  // Which list is on screen. A row fetches its own photo, so rebuilding the
  // list is not free — and this runs on every GPS fix. Only an actual change
  // to *which* missions are valid is worth a rebuild.
  let renderedKey = null;
  let detailToken = 0;

  // --- the detail screen ---------------------------------------------------

  async function openSpecies(species) {
    const detail = SpeciesDetail(species, { onBack: () => view.showList() });
    view.showDetail(detail);
    // The map is the other half of this screen: it shows the zone you would
    // walk into and the surface it was cut from, and stays visible while you
    // read. That is the whole reason this is not a sheet over the map.
    map.showMission(species);

    if (!species.id) return;
    const token = ++detailToken;
    try {
      const extra = await fetchMissionDetail({ id: species.id, lang: uiLang() });
      if (token !== detailToken || !detail.isConnected) return;
      if (!species.extent && extra?.extent) {
        map.showMission({ ...species, extent: extra.extent });
      }
      detail.setChance(extra?.metrics?.p_mean);
      detail.setDescription(extra?.description);
      detail.setTrivia(extra?.trivia);
    } catch (e) {
      if (token !== detailToken) return;
      console.error("[MapPage] mission detail failed:", e);
    }
  }

  view.onDetailBack(() => {
    detailToken++;            // abandon any detail response still in flight
    map.clearMission();
  });

  map.onOpen(openSpecies);
  map.onBackgroundClick(() => view.showList());

  // --- missions tab: derived from what the map already has ------------------

  function renderValid() {
    // While the first load is still out there is nothing to say yet, and a
    // "no missions here" that turns into a list a second later is worse than
    // a spinner. Same for having no fix: the answer depends on where you are.
    view.setMissionsLoading(missionsLoading);
    if (missionsLoading) return;

    const here = missionsAtPoint(missions, position?.lat, position?.lon);
    const key = `${position ? 1 : 0}|${here.map((m) => m.id ?? `${m.gbif_id}:${m.lat}:${m.lon}`).join(",")}`;
    if (key === renderedKey) return;
    renderedKey = key;

    view.renderValidMissions(
      here.map((mission) => SpeciesRow(mission, { onClick: openSpecies })),
      { locating: !position }
    );
  }

  map.onLoading((on) => {
    missionsLoading = on;
    renderValid();
  });

  map.onMissions((all) => {
    missions = all;
    renderValid();
  });

  map.onPosition((pos) => {
    // Predictions are for a point. Walk far enough from the one they were
    // fetched at and they stop being about here, so the tab reloads next time
    // it is opened rather than showing yesterday's neighbourhood.
    if (aroundAt && distanceMeters(aroundAt, pos) > AROUND_STALE_M) aroundLoaded = false;
    position = pos;
    renderValid();
  });

  // --- around you: one reading, taken where the player stands ---------------

  async function loadAround() {
    if (aroundLoaded || aroundLoading) return;
    aroundLoading = true;
    view.setAroundLoading(true);
    try {
      const pos = position ?? await getCurrentPosition().then((p) => ({
        lat: p.coords.latitude, lon: p.coords.longitude,
      }));
      const { predictions } = await fetchPredictions({
        lat: pos.lat, lon: pos.lon, lang: uiLang(),
      });
      // rank 0 is the model's best match.
      aroundSpecies = [...(predictions ?? [])].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
      aroundLoaded = true;
      aroundAt = pos;
      renderAround();
    } catch (e) {
      console.error("[MapPage] around fetch failed:", e);
      aroundSpecies = [];
      renderAround();
    } finally {
      aroundLoading = false;
      view.setAroundLoading(false);
    }
  }

  function renderAround() {
    view.renderAround(aroundSpecies.map((s) => SpeciesRow(s, { onClick: openSpecies })));
  }

  view.onTabSwitch((tab) => {
    const isAround = tab === "around";
    // Pins are places to walk to; this tab is a reading taken where you are.
    // They would answer a question nobody asked and cover the one marker that
    // matters, so they come off and the map goes back to the player.
    map.setPinsVisible(!isAround);
    map.clearMission();
    if (isAround) {
      map.recenterOnUser(AROUND_ZOOM);
      loadAround();
    }
  });

  view.onResize(() => map.invalidate());

  // --- the camera ----------------------------------------------------------

  // One panel, kept across observations: it owns the file input the camera is
  // opened through, and rebuilding it per shot would lose that handle.
  const identify = IdentifyPanel({
    onFilesChange: (files) => {
      // The camera is opened first and the sheet follows the photo, so a
      // cancelled shot leaves the map exactly as it was.
      if (files.length) view.openObserveSheet();
      else view.closeObserveSheet();
    },
    onSubmit: () => view.closeObserveSheet(),
  });
  view.observeSlot.appendChild(identify);

  view.onObserve(() => identify.openPicker());
  // Dismissing the sheet abandons the shot. Keeping the photos would mean the
  // next "make an observation" quietly reopened with the old one attached.
  view.onObserveSheetClose(() => identify.clearPhotos());

  document.addEventListener("i18n:changed", () => {
    view.refreshI18n();
    renderedKey = null; // the rows themselves are language-dependent
    renderValid();
    renderAround();
  });

  renderValid();

  return {
    element: view.element,
    start: () => map.start(),
    invalidate: () => map.invalidate(),
    stop: () => map.stop(),
  };
}
