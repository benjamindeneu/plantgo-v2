// src/ui/components/MissionMap.view.js
import L from "https://esm.sh/leaflet@1.9.4";
import { t } from "../../language/i18n.js";

const DEFAULT_ZOOM = 16;
// Mirrors the --pin-size values in the .mp-pin--* CSS rules. Leaflet sizes and
// anchors the marker's clickable box itself, so it has to agree with the CSS
// rather than just clip a differently-sized div inside it.
const PIN_SIZE = { common: 27, rare: 30, epic: 33, legendary: 36 };
const PIN_BOX_SLACK = 4; // room for the box-shadow around the pin shape
// How many pins may sit on the map before the furthest are dropped. Comfortably
// more than one response carries: at 140, every single fetch evicted half of
// what it had just added, and watching a third of the pins vanish and reappear
// on each pan looked like the map reloading.
const MAX_PINS = 400;

// The species raster sits in a pane of its own, between the satellite imagery
// (tilePane, 200) and the extent outline (overlayPane, 400). Sharing the tile
// pane with the basemap would leave the stacking order down to insertion
// order, and the outline and pins have to stay readable through it.
const RASTER_PANE = "speciesRaster";
const RASTER_PANE_Z = 350;
// The zone's fill goes *under* the raster, between it and the satellite
// imagery: the fill says "this is the ground the mission covers", the raster
// says "and here is where the plant is likely on it". With the fill on top it
// washed 20% of white-green over the very colours you are meant to read.
// The zone's outline stays in overlayPane (400), above both.
const EXTENT_FILL_PANE = "extentFill";
const EXTENT_FILL_PANE_Z = 300;
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

/**
 * The map, and nothing else.
 *
 * It used to own a bottom sheet as well, which opened over the map whenever a
 * pin was tapped and covered most of what the player had just tapped *on*. The
 * mission is shown in the page's own sheet now, so this draws the ground, the
 * pins and the selected species' zone, and reports taps upward.
 */
export function createMissionMapView() {
  const root = document.createElement("div");
  root.className = "mission-map-root";
  root.innerHTML = `
    <div id="mapCanvas" class="mission-map-canvas"></div>

    <div class="mp-map-status-wrap">
      <div id="mapStatus" class="mp-map-status" aria-live="polite"></div>
    </div>

    <div class="mp-map-controls">
      <button id="mapRefresh" class="mp-map-btn" type="button" aria-label="Refresh">
        <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path fill="currentColor" d="M12 5V2L8 6l4 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>
      </button>
      <button id="mapLocate" class="mp-map-btn" type="button" aria-label="Recenter">
        <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path fill="currentColor" d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0-6a1 1 0 0 1 1 1v1.06A8 8 0 0 1 19.94 11H21a1 1 0 1 1 0 2h-1.06A8 8 0 0 1 13 19.94V21a1 1 0 1 1-2 0v-1.06A8 8 0 0 1 4.06 13H3a1 1 0 1 1 0-2h1.06A8 8 0 0 1 11 4.06V3a1 1 0 0 1 1-1zm0 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12z"/></svg>
      </button>
    </div>

    <!-- Mouse-and-trackpad affordance for the zoom gestures a touchscreen
         already has pinch for; hidden on mobile widths in CSS. -->
    <div class="mp-zoom-controls">
      <button id="mapZoomIn" class="mp-map-btn" type="button" aria-label="Zoom in">
        <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path fill="currentColor" d="M11 5a1 1 0 0 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5z"/></svg>
      </button>
      <button id="mapZoomOut" class="mp-map-btn" type="button" aria-label="Zoom out">
        <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path fill="currentColor" d="M5 11h14a1 1 0 1 1 0 2H5a1 1 0 1 1 0-2z"/></svg>
      </button>
    </div>

    <div id="rasterLegend" class="mp-legend" hidden>
      <span id="rasterLegendTitle" class="mp-legend__title"></span>
      <div class="mp-legend__body">
        <div class="mp-legend__ramp-wrap">
          <span class="mp-legend__ramp" aria-hidden="true"></span>
          <span class="mp-legend__scale"><span id="rasterLegendLow"></span><span id="rasterLegendHigh"></span></span>
        </div>
        <span class="mp-legend__slider">
          <svg class="mp-legend__slider-icon" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
            <path fill="currentColor" d="M12 4.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15zm0 1.6v11.8a5.9 5.9 0 0 1 0-11.8z"/>
          </svg>
          <input id="rasterOpacity" class="mp-legend__opacity" type="range"
                 min="0" max="100" value="55" aria-label="Species layer opacity" />
        </span>
      </div>
    </div>
  `;

  const canvasEl = root.querySelector("#mapCanvas");
  const statusEl = root.querySelector("#mapStatus");
  const refreshBtn = root.querySelector("#mapRefresh");
  const locateBtn = root.querySelector("#mapLocate");
  const zoomInBtn = root.querySelector("#mapZoomIn");
  const zoomOutBtn = root.querySelector("#mapZoomOut");
  const legendEl = root.querySelector("#rasterLegend");
  const legendTitleEl = root.querySelector("#rasterLegendTitle");
  const legendLowEl = root.querySelector("#rasterLegendLow");
  const legendHighEl = root.querySelector("#rasterLegendHigh");
  const opacityEl = root.querySelector("#rasterOpacity");

  let map = null;
  let userMarker = null;
  const pinLayer = L.layerGroup();
  let pinsVisible = true;
  let rasterLayer = null;
  // The template the layer on the map was built from. Toggling the clip must
  // not tear the tiles down and refetch them, so a call that only changes the
  // clip is told apart from one that changes the species.
  let rasterUrl = null;
  // The zone the raster is clipped to, in lat/lng. Kept so the clip can be
  // recomputed in pixel space whenever the map moves under it.
  let rasterClipRing = null;
  // The zone is drawn as three layers — fill under the raster, then a dark
  // casing and the bright dashed line over it — so they are cleared together.
  let extentLayers = [];
  let fallbackCircle = null;
  const markersById = new Map();
  // Mission ids the player has already accomplished today.
  let missionsDone = new Set();
  let selectedId = null;
  let programmaticMove = false;
  let statusTimer = null;
  // The viewport the last moveend was reported at, so a moveend that did not
  // move the map can be told apart from one that did.
  let lastReported = null;

  let onPinClick = null;
  let onMoveEnd = null;
  let onLocate = null;
  let onRefresh = null;
  let onBackgroundClick = null;

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

    const fillPane = map.createPane(EXTENT_FILL_PANE);
    fillPane.style.zIndex = String(EXTENT_FILL_PANE_Z);
    fillPane.style.pointerEvents = "none";

    const rasterPane = map.createPane(RASTER_PANE);
    rasterPane.style.zIndex = String(RASTER_PANE_Z);
    rasterPane.style.pointerEvents = "none";

    pinLayer.addTo(map);

    // The clip is expressed in layer pixels, so it has to be re-cut whenever
    // the projection origin moves under it. `zoom` fires continuously through
    // an animated zoom, which keeps the edge on the zone instead of letting it
    // drift and snap back at the end.
    map.on("move zoom zoomend viewreset", applyRasterClip);

    map.on("moveend", () => {
      const vp = getViewport();

      // Recentring and zone-fitting move the map themselves; that must not be
      // mistaken for the user exploring. Recording the viewport as reported
      // also covers the second moveend an animated fit can emit.
      if (programmaticMove) { programmaticMove = false; lastReported = vp; return; }

      // Nor may a moveend that moved nothing. `invalidateSize()` fires one
      // every time — and a phone fires a window resize on every scroll, as its
      // URL bar slides in and out, so the map was reporting a pan several
      // times a minute while standing still. Compare where the map actually
      // is, not whether an event arrived.
      if (lastReported
          && vp.zoom === lastReported.zoom
          && Math.abs(vp.lat - lastReported.lat) < 1e-7
          && Math.abs(vp.lon - lastReported.lon) < 1e-7) return;

      lastReported = vp;
      if (onMoveEnd) onMoveEnd(vp);
    });

    map.on("click", () => { if (onBackgroundClick) onBackgroundClick(); });
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

  function keyOf(mission) {
    return mission.id || `${mission.gbif_id}:${mission.lat}:${mission.lon}`;
  }

  function isDone(mission) {
    return !!mission?.id && missionsDone.has(mission.id);
  }

  function missionIcon(mission, isSelected) {
    const tier = mission?.grade?.tier || "common";
    const done = isDone(mission);
    // A mission accomplished today wears a tick instead of its initial: at pin
    // size there is room for one glyph, and which mission it is matters less
    // than that there is nothing left to do there until tomorrow.
    const label = done
      ? "✓"
      : (mission.vernacular_name || mission.name || "?").trim().charAt(0).toUpperCase();
    const box = (PIN_SIZE[tier] ?? PIN_SIZE.common) + PIN_BOX_SLACK;
    return L.divIcon({
      className: "",
      html: `<div class="mp-pin mp-pin--${tier}${isSelected ? " is-selected" : ""}${done ? " is-done" : ""}">
               <span class="mp-pin__glyph">${escapeHtml(label)}</span>
             </div>`,
      iconSize: [box, box],
      iconAnchor: [box / 2, box],
    });
  }

  /** Repaint only the two pins whose state changed, not all of them. */
  function repaint(key) {
    const entry = key && markersById.get(key);
    if (entry) entry.marker.setIcon(missionIcon(entry.mission, key === selectedId));
  }

  /**
   * While one mission is selected, its neighbours come off the map.
   *
   * The detail screen is about one species and the map is showing its zone and
   * surface; a field of other pins on top of that is noise you have to read
   * past, and tapping one by accident throws away the screen you were reading.
   * Faded rather than removed, so the pins come straight back on the way out
   * without rebuilding four hundred markers.
   */
  function applyFocus() {
    const focused = selectedId != null;
    for (const [key, entry] of markersById) {
      const visible = !focused || key === selectedId;
      entry.marker.setOpacity(visible ? 1 : 0);
      // A pin you cannot see must not be tappable either.
      const el = entry.marker.getElement();
      if (el) el.style.pointerEvents = visible ? "" : "none";
    }
  }

  function clearExtent() {
    for (const layer of extentLayers) layer.remove();
    extentLayers = [];
    if (fallbackCircle) { fallbackCircle.remove(); fallbackCircle = null; }
  }

  function clearRaster() {
    if (rasterLayer) { rasterLayer.remove(); rasterLayer = null; }
    rasterUrl = null;
    rasterClipRing = null;
    applyRasterClip();
    legendEl.hidden = true;
  }

  /**
   * Paint the species surface only inside the mission's own zone.
   *
   * The raster answers "how likely is this plant here", and that question is
   * only being asked about the ground the mission covers — painting the whole
   * viewport buries the zone outline in colour and invites the player to walk
   * to a bright patch that belongs to no mission. The pane carries a CSS
   * clip-path in layer pixels, so it is recomputed whenever the map moves.
   */
  function applyRasterClip() {
    const pane = map?.getPane(RASTER_PANE);
    if (!pane) return;
    if (!rasterClipRing || !rasterLayer) { pane.style.clipPath = ""; return; }
    const pts = rasterClipRing.map(([lng, lat]) => {
      const p = map.latLngToLayerPoint([lat, lng]);
      return `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`;
    });
    pane.style.clipPath = pts.length >= 3 ? `polygon(${pts.join(",")})` : "";
  }

  function setRasterOpacity(value01) {
    if (rasterLayer) rasterLayer.setOpacity(value01);
  }

  /** Keep a fitted zone comfortably inside the visible map band. */
  function fitToExtent(bounds) {
    if (!bounds?.isValid?.()) return;
    programmaticMove = true;
    map.fitBounds(bounds, { padding: [34, 34], maxZoom: 17 });
  }

  // Blink and WebKit have no ::-moz-range-progress, so the filled part of the
  // track is a gradient stop the slider drives itself. Firefox ignores it and
  // paints the real progress pseudo-element instead.
  function syncOpacityFill() {
    opacityEl.style.setProperty("--fill", `${opacityEl.value}%`);
  }
  opacityEl.addEventListener("input", () => {
    setRasterOpacity(Number(opacityEl.value) / 100);
    syncOpacityFill();
  });
  syncOpacityFill();
  // The legend sits over the map; without this a drag on the slider pans the
  // map underneath it.
  ["pointerdown", "mousedown", "touchstart", "dblclick", "wheel"].forEach((evt) =>
    legendEl.addEventListener(evt, (e) => e.stopPropagation()));

  refreshBtn.addEventListener("click", () => { if (onRefresh) onRefresh(); });
  locateBtn.addEventListener("click", () => { if (onLocate) onLocate(); });
  zoomInBtn.addEventListener("click", () => map?.zoomIn());
  zoomOutBtn.addEventListener("click", () => map?.zoomOut());

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
          icon: L.divIcon({ className: "", html: `<div class="mp-user-dot"></div>`, iconSize: [22, 22], iconAnchor: [11, 11] }),
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
     * Whether mission pins are on the map at all.
     *
     * "Around you" is a reading taken at one point, not a set of places to
     * walk to, so the pins would be answering a question nobody asked — and
     * they cover the one marker that tab is about.
     */
    setPinsVisible(visible) {
      pinsVisible = visible;
      if (!map) return;
      if (visible && !map.hasLayer(pinLayer)) pinLayer.addTo(map);
      if (!visible && map.hasLayer(pinLayer)) map.removeLayer(pinLayer);
    },

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
        const key = keyOf(mission);
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

      // A fetch can land while a mission is open; its pins must not appear on
      // top of the one being read.
      if (added && selectedId != null) applyFocus();

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

    /**
     * Which missions are accomplished today. Only the pins whose state
     * actually changed are repainted — this arrives on a live subscription,
     * and redrawing four hundred icons for one completion would be visible.
     */
    setMissionsDone(ids) {
      const next = ids instanceof Set ? ids : new Set(ids || []);
      const changed = [];
      for (const [key, entry] of markersById) {
        const id = entry.mission?.id;
        if (!id) continue;
        if (missionsDone.has(id) !== next.has(id)) changed.push(key);
      }
      missionsDone = next;
      for (const key of changed) repaint(key);
    },

    /**
     * Raise one pin and take the others off the map. Pass null to restore them.
     */
    selectMission(mission) {
      const previous = selectedId;
      selectedId = mission ? keyOf(mission) : null;
      if (previous === selectedId) return;
      repaint(previous);
      repaint(selectedId);
      applyFocus();
    },

    /** Take the selected species' surface and zone back off the map. */
    clearOverlays() {
      clearExtent();
      clearRaster();
    },

    /**
     * Paint the selected species' probability surface under the map chrome.
     *
     * Passing null takes it down, so switching to a mission that has no raster
     * clears the previous one rather than leaving the wrong species showing.
     */
    showRaster(templateUrl, clipGeojson = null) {
      if (!map) return;
      if (!templateUrl) { clearRaster(); return; }

      // Outer ring only: a mission zone is a convex hull, so it has exactly
      // one and never a hole. Null means paint the whole viewport.
      const ring = clipGeojson?.coordinates?.[0] ?? null;

      // Same species, different clip — keep the tiles and just re-cut the pane.
      if (rasterLayer && rasterUrl === templateUrl) {
        rasterClipRing = ring;
        applyRasterClip();
        return;
      }

      clearRaster();
      rasterUrl = templateUrl;
      rasterLayer = L.tileLayer(templateUrl, {
        pane: RASTER_PANE,
        opacity: Number(opacityEl.value) / 100,
        className: "species-raster",
        maxNativeZoom: RASTER_MAX_NATIVE_ZOOM,
        maxZoom: 19,
        errorTileUrl: BLANK_TILE,
      }).addTo(map);

      rasterClipRing = ring;
      applyRasterClip();
      legendEl.hidden = false;
    },

    /**
     * Outline the mission's ground.
     *
     * Three layers, because one flat green line over satellite imagery is
     * exactly the case a single stroke loses: the basemap is mostly vegetation
     * and rooftops, and mid-green on either of those disappears. A dark casing
     * underneath separates the line from whatever it crosses, and the line
     * itself is the brand's brightest green so it reads as ours rather than as
     * a generic map annotation.
     */
    showExtent(geojson) {
      if (!map || !geojson) return;
      clearExtent();

      const fill = L.geoJSON(geojson, {
        pane: EXTENT_FILL_PANE,
        style: { stroke: false, fillColor: "#4fe39b", fillOpacity: 0.22 },
        interactive: false,
      }).addTo(map);

      const casing = L.geoJSON(geojson, {
        style: { color: "#06301f", weight: 6, opacity: 0.5, fill: false, lineJoin: "round" },
        interactive: false,
      }).addTo(map);

      const line = L.geoJSON(geojson, {
        className: "mp-extent-line",
        style: {
          color: "#4fe39b", weight: 2.5, opacity: 1,
          dashArray: "8 6", lineCap: "round", lineJoin: "round", fill: false,
        },
        interactive: false,
      }).addTo(map);

      extentLayers = [fill, casing, line];

      // Selecting a mission is a request to look at it, so the map always
      // frames the full zone rather than just wherever the tap landed.
      const bounds = line.getBounds();
      if (bounds.isValid()) fitToExtent(bounds);
    },

    /** No raster for this species — show the search radius instead of a shape. */
    showFallbackRadius(lat, lon, { radius = 250 } = {}) {
      if (!map) return;
      clearExtent();
      // Same casing treatment as a real zone, in the amber that means
      // "approximate" everywhere else in the app. Tracked with the zone layers
      // so `clearExtent` takes it down too.
      extentLayers.push(L.circle([lat, lon], {
        radius, color: "#3d2400", weight: 5, opacity: 0.45,
        fill: false, interactive: false,
      }).addTo(map));
      fallbackCircle = L.circle([lat, lon], {
        className: "mp-extent-line",
        radius, color: "#ffc861", weight: 2.5, dashArray: "8 6", lineCap: "round",
        fillColor: "#e59413", fillOpacity: 0.14, interactive: false,
      }).addTo(map);
      const bounds = fallbackCircle.getBounds();
      if (bounds.isValid()) fitToExtent(bounds);
    },

    onPinClick(cb) { onPinClick = cb; },
    onMoveEnd(cb) { onMoveEnd = cb; },
    onLocate(cb) { onLocate = cb; },
    onRefresh(cb) { onRefresh = cb; },
    onBackgroundClick(cb) { onBackgroundClick = cb; },

    refreshI18n() {
      refreshBtn.setAttribute("aria-label", t("map.refresh"));
      locateBtn.setAttribute("aria-label", t("map.recenter"));
      zoomInBtn.setAttribute("aria-label", t("map.zoomIn"));
      zoomOutBtn.setAttribute("aria-label", t("map.zoomOut"));
      legendTitleEl.textContent = t("map.legend.title");
      legendLowEl.textContent = t("map.legend.low");
      legendHighEl.textContent = t("map.legend.high");
    },
  };
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
