// src/ui/components/MissionMap.view.js
import L from "https://esm.sh/leaflet@1.9.4";
import { t } from "../../language/i18n.js";

const DEFAULT_ZOOM = 16;
// How many pins may sit on the map before the furthest are dropped.
const MAX_PINS = 140;

// The species raster sits in a pane of its own, between the satellite imagery
// (tilePane, 200) and the extent outline (overlayPane, 400). Sharing the tile
// pane with the basemap would leave the stacking order down to insertion
// order, and the outline and pins have to stay readable through it.
const RASTER_PANE = "speciesRaster";
const RASTER_PANE_Z = 350;
// Enough to read the gradient, little enough to keep the imagery underneath
// legible — the point is to place the species against the terrain you are
// about to walk, and a common species paints most of a city bright.
const RASTER_OPACITY = 0.4;
// The rasters are 50 m/px, which zoom 13 already oversamples fourfold. Asking
// the service for deeper levels quadruples the requests per level for pixels
// the data does not have; Leaflet stretches the z13 tile instead.
const RASTER_MAX_NATIVE_ZOOM = 13;
// Outside a species' footprint the service answers 204, which reaches the
// <img> as an error. Handing Leaflet a blank tile keeps that from surfacing
// as a broken-image glyph.
const BLANK_TILE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/** Points tiers, matching the rarity thresholds used by MissionCard. */
function tierFor(points) {
  if (points >= 1500) return "legendary";
  if (points >= 1000) return "epic";
  if (points >= 500) return "rare";
  return "common";
}

export function createMissionMapView() {
  const root = document.createElement("div");
  root.className = "mission-map-root";
  root.innerHTML = `
    <div id="mapCanvas" class="mission-map-canvas"></div>

    <div class="mission-map-topbar">
      <div id="mapStatus" class="mission-map-status" aria-live="polite"></div>
    </div>

    <div class="mission-map-controls">
      <button id="mapRefresh" class="mission-map-btn" type="button" aria-label="Refresh">⟳</button>
      <button id="mapLocate" class="mission-map-btn" type="button" aria-label="Recenter">◎</button>
    </div>

    <div id="rasterLegend" class="raster-legend" hidden>
      <span id="rasterLegendTitle" class="raster-legend__title"></span>
      <span class="raster-legend__ramp" aria-hidden="true"></span>
      <span class="raster-legend__scale"><span>20%</span><span>100%</span></span>
    </div>

    <div id="missionSheet" class="mission-sheet" aria-hidden="true">
      <button id="sheetClose" class="mission-sheet__close" type="button" aria-label="Close">×</button>
      <div class="mission-sheet__grab" aria-hidden="true"></div>
      <div id="sheetMeta" class="mission-sheet__meta"></div>
      <div id="sheetBody" class="mission-sheet__body"></div>
    </div>
  `;

  const canvasEl = root.querySelector("#mapCanvas");
  const statusEl = root.querySelector("#mapStatus");
  const refreshBtn = root.querySelector("#mapRefresh");
  const locateBtn = root.querySelector("#mapLocate");
  const sheetEl = root.querySelector("#missionSheet");
  const sheetMetaEl = root.querySelector("#sheetMeta");
  const sheetBodyEl = root.querySelector("#sheetBody");
  const sheetCloseEl = root.querySelector("#sheetClose");
  const legendEl = root.querySelector("#rasterLegend");
  const legendTitleEl = root.querySelector("#rasterLegendTitle");

  let map = null;
  let userMarker = null;
  const pinLayer = L.layerGroup();
  let rasterLayer = null;
  let extentLayer = null;
  let fallbackCircle = null;
  const markersById = new Map();
  let selectedId = null;
  let programmaticMove = false;
  let statusTimer = null;

  let onPinClick = null;
  let onMoveEnd = null;
  let onLocate = null;
  let onRefresh = null;
  let onSheetClose = null;

  function ensureMap(lat, lon) {
    if (map) return map;
    map = L.map(canvasEl, {
      zoomControl: false,
      attributionControl: false,
      keyboard: false,
    }).setView([lat, lon], DEFAULT_ZOOM);

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19 }
    ).addTo(map);

    const rasterPane = map.createPane(RASTER_PANE);
    rasterPane.style.zIndex = String(RASTER_PANE_Z);
    rasterPane.style.pointerEvents = "none";

    L.control.zoom({ position: "topleft" }).addTo(map);
    pinLayer.addTo(map);

    map.on("moveend", () => {
      // Fitting to an extent moves the map itself; that must not be mistaken
      // for the user exploring.
      if (programmaticMove) { programmaticMove = false; return; }
      if (onMoveEnd) onMoveEnd(getViewport());
    });
    // A tap on empty map dismisses the sheet, like any map app.
    map.on("click", () => closeSheet());
    return map;
  }

  function getViewport() {
    if (!map) return null;
    const c = map.getCenter();
    const bounds = map.getBounds();
    // Half the diagonal covers the visible area. Capped hard: the server reads
    // a raster window per species, so a zoomed-out viewport would multiply that
    // work for missions nobody is close enough to walk to anyway.
    const radius = Math.round(c.distanceTo(bounds.getNorthEast()));
    return { lat: c.lat, lon: c.lng, radius_m: Math.min(Math.max(radius, 400), 2500), zoom: map.getZoom() };
  }

  function missionIcon(mission, isSelected) {
    const tier = mission?.grade?.tier || "common";
    const label = (mission.vernacular_name || mission.name || "?").trim().charAt(0).toUpperCase();
    return L.divIcon({
      className: "",
      html: `<div class="mission-pin mission-pin--${tier}${isSelected ? " is-selected" : ""}">
               <span class="mission-pin__glyph">${escapeHtml(label)}</span>
             </div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
    });
  }

  function clearExtent() {
    if (extentLayer) { extentLayer.remove(); extentLayer = null; }
    if (fallbackCircle) { fallbackCircle.remove(); fallbackCircle = null; }
  }

  function clearRaster() {
    if (rasterLayer) { rasterLayer.remove(); rasterLayer = null; }
    legendEl.hidden = true;
  }

  function closeSheet() {
    if (sheetEl.getAttribute("aria-hidden") === "true") return;
    sheetEl.setAttribute("aria-hidden", "true");
    sheetEl.classList.remove("is-open");
    clearExtent();
    clearRaster();
    if (selectedId) {
      const prev = markersById.get(selectedId);
      if (prev) prev.marker.setIcon(missionIcon(prev.mission, false));
      selectedId = null;
    }
    if (onSheetClose) onSheetClose();
  }

  refreshBtn.addEventListener("click", () => { if (onRefresh) onRefresh(); });
  locateBtn.addEventListener("click", () => { if (onLocate) onLocate(); });
  sheetCloseEl.addEventListener("click", () => closeSheet());
  // Dragging the sheet down closes it, which is how a bottom sheet should feel.
  let dragStartY = null;
  sheetEl.addEventListener("touchstart", (e) => {
    if (e.target.closest(".mission-sheet__body")) return;
    dragStartY = e.touches[0].clientY;
  }, { passive: true });
  sheetEl.addEventListener("touchmove", (e) => {
    if (dragStartY == null) return;
    const dy = e.touches[0].clientY - dragStartY;
    if (dy > 0) sheetEl.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  sheetEl.addEventListener("touchend", (e) => {
    if (dragStartY == null) return;
    const dy = (e.changedTouches[0]?.clientY ?? dragStartY) - dragStartY;
    sheetEl.style.transform = "";
    dragStartY = null;
    if (dy > 90) closeSheet();
  });

  return {
    element: root,

    /** Leaflet needs an explicit nudge after its container is sized or shown. */
    invalidate() { map?.invalidateSize(); },

    /** `transient` clears the message after a moment — for confirmations. */
    setStatus(text, { busy = false, transient = false } = {}) {
      clearTimeout(statusTimer);
      statusEl.textContent = text ?? "";
      statusEl.classList.toggle("is-busy", !!busy);
      statusEl.style.display = text ? "" : "none";
      if (text && transient) {
        statusTimer = setTimeout(() => {
          statusEl.textContent = "";
          statusEl.style.display = "none";
        }, 2200);
      }
    },

    setUserLocation(lat, lon) {
      ensureMap(lat, lon);
      if (!userMarker) {
        userMarker = L.marker([lat, lon], {
          icon: L.divIcon({ className: "", html: `<div class="user-dot"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] }),
          interactive: false,
          zIndexOffset: 500,
        }).addTo(map);
      } else {
        userMarker.setLatLng([lat, lon]);
      }
    },

    recenter(lat, lon, zoom = DEFAULT_ZOOM) {
      const existed = !!map;
      ensureMap(lat, lon);
      // Recentring is the app moving the map, not the user exploring. Without
      // this the locate flow fired its own fetch *and* a moveend fetch, so two
      // identical requests raced on every open.
      if (existed) programmaticMove = true;
      map.setView([lat, lon], zoom);
    },

    getViewport,

    /**
     * Add missions to the map, keeping the ones already there.
     *
     * Panning asks the server about the new centre, which answers with the
     * missions near it. Replacing the set each time kept the pin count flat
     * and made exploring look like nothing was happening; accumulating lets
     * the map visibly fill in as you move, which is the point of panning.
     * Returns how many were new.
     */
    renderPins(missions = []) {
      if (!map) return 0;
      let added = 0;

      for (const mission of missions) {
        const key = mission.id || `${mission.gbif_id}:${mission.lat}:${mission.lon}`;
        if (markersById.has(key)) {
          markersById.get(key).mission = mission;
          continue;
        }
        const marker = L.marker([mission.lat, mission.lon], {
          icon: missionIcon(mission, false),
          title: mission.vernacular_name || mission.name,
          riseOnHover: true,
        });
        marker.on("click", () => { if (onPinClick) onPinClick(mission); });
        marker.addTo(pinLayer);
        markersById.set(key, { marker, mission });
        added++;
      }

      // Cap the layer so a long session does not accumulate forever; the ones
      // furthest from where you are looking go first.
      if (markersById.size > MAX_PINS) {
        const centre = map.getCenter();
        const ranked = [...markersById.entries()]
          .filter(([key]) => key !== selectedId)
          .map(([key, entry]) => [key, entry, centre.distanceTo(entry.marker.getLatLng())])
          .sort((a, b) => b[2] - a[2]);
        for (const [key, entry] of ranked) {
          if (markersById.size <= MAX_PINS) break;
          entry.marker.remove();
          markersById.delete(key);
        }
      }
      return added;
    },

    /** Opens the sheet immediately with what the pin already knows. */
    openSheet(mission, cardElement) {
      selectedId = mission.id || `${mission.gbif_id}:${mission.lat}:${mission.lon}`;
      for (const [key, entry] of markersById) {
        entry.marker.setIcon(missionIcon(entry.mission, key === selectedId));
      }
      sheetBodyEl.innerHTML = "";
      if (cardElement) sheetBodyEl.appendChild(cardElement);
      sheetMetaEl.innerHTML = "";
      sheetEl.setAttribute("aria-hidden", "false");
      sheetEl.classList.add("is-open");
    },

    /** Extra blocks below the mission card (trivia, actions). */
    appendToSheet(element) {
      if (element) sheetBodyEl.appendChild(element);
    },

    setSheetMeta(items = []) {
      sheetMetaEl.innerHTML = "";
      for (const item of items) {
        if (!item) continue;
        const chip = document.createElement("span");
        chip.className = `mission-meta-chip${item.tone ? ` mission-meta-chip--${item.tone}` : ""}`;
        chip.textContent = item.label;
        sheetMetaEl.appendChild(chip);
      }
    },

    closeSheet,

    /**
     * Paint the selected species' probability surface under the map chrome.
     *
     * Passing null takes it down, so switching to a mission that has no raster
     * clears the previous one rather than leaving the wrong species showing.
     */
    showRaster(templateUrl) {
      if (!map) return;
      clearRaster();
      if (!templateUrl) return;

      rasterLayer = L.tileLayer(templateUrl, {
        pane: RASTER_PANE,
        opacity: RASTER_OPACITY,
        className: "species-raster",
        maxNativeZoom: RASTER_MAX_NATIVE_ZOOM,
        maxZoom: 19,
        errorTileUrl: BLANK_TILE,
      }).addTo(map);
      legendEl.hidden = false;
    },

    showExtent(geojson) {
      if (!map || !geojson) return;
      if (extentLayer) extentLayer.remove();
      extentLayer = L.geoJSON(geojson, {
        style: {
          color: "#22c55e", weight: 2, opacity: 0.95,
          dashArray: "5 4", fillColor: "#22c55e", fillOpacity: 0.22,
        },
        interactive: false,
      }).addTo(map);
      fitToExtent(extentLayer.getBounds());
    },

    /** No raster for this species — show the search radius instead of a shape. */
    showFallbackRadius(lat, lon, radius = 250) {
      if (!map) return;
      if (fallbackCircle) fallbackCircle.remove();
      fallbackCircle = L.circle([lat, lon], {
        radius, color: "#c2410c", weight: 2, dashArray: "4 5",
        fillColor: "#c2410c", fillOpacity: 0.12, interactive: false,
      }).addTo(map);
      fitToExtent(fallbackCircle.getBounds());
    },

    onPinClick(cb) { onPinClick = cb; },
    onMoveEnd(cb) { onMoveEnd = cb; },
    onLocate(cb) { onLocate = cb; },
    onRefresh(cb) { onRefresh = cb; },
    onSheetClose(cb) { onSheetClose = cb; },

    refreshI18n() {
      refreshBtn.setAttribute("aria-label", t("map.refresh"));
      locateBtn.setAttribute("aria-label", t("map.recenter"));
      sheetCloseEl.setAttribute("aria-label", t("common.close"));
      legendTitleEl.textContent = t("map.legend.title");
    },
  };

  /** Keep the extent clear of the sheet that is covering the bottom of the map. */
  function fitToExtent(bounds) {
    if (!bounds?.isValid?.()) return;
    const sheetHeight = sheetEl.classList.contains("is-open") ? sheetEl.offsetHeight : 0;
    programmaticMove = true;
    map.fitBounds(bounds, {
      paddingTopLeft: [30, 60],
      paddingBottomRight: [30, sheetHeight + 30],
      maxZoom: 17,
    });
  }
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
