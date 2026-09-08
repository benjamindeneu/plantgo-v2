// src/ui/components/MapPage.view.js
import { t } from "../../language/i18n.js";

/**
 * The shell the mission map lives in.
 *
 * Three bands and two floating layers: the map fills the screen, a capsule of
 * tabs floats over the top of it, a sheet rides over its bottom edge, and the
 * camera sits above everything where a thumb reaches. The map itself is not
 * built here — it is mounted into `mapSlot` — because Leaflet measures its
 * container on init and this layout decides that container's height.
 *
 * The sheet's height is fixed rather than sized to its contents. A panel that
 * grew and shrank with the list resized the map underneath it on every load,
 * which read as the map reloading; a stable sheet that scrolls its own
 * contents is both calmer and how every map app on a phone behaves.
 */
export function createMapPageView() {
  const root = document.createElement("div");
  root.className = "mp-shell";
  root.innerHTML = `
    <div id="mapSlot" class="mp-map"></div>

    <div class="mp-tabs" role="tablist">
      <button class="mp-tab is-active" id="tabMissions" type="button" role="tab" aria-selected="true"></button>
      <button class="mp-tab" id="tabAround" type="button" role="tab" aria-selected="false"></button>
    </div>

    <div class="mp-sheet">
      <span class="mp-sheet__grab" aria-hidden="true"></span>

      <div id="screenList" class="mp-screen">
        <div class="mp-sheet__head">
          <h2 id="paneTitle" class="mp-sheet__title"></h2>
          <span id="paneCount" class="mp-sheet__count" hidden></span>
        </div>
        <div class="mp-sheet__scroll">
          <section id="paneMissions">
            <div id="missionsSpinner" class="mp-spinner" hidden aria-hidden="true"></div>
            <div id="missionsList" class="mp-list"></div>
          </section>
          <section id="paneAround" hidden>
            <div id="aroundSpinner" class="mp-spinner" hidden aria-hidden="true"></div>
            <div id="aroundList" class="mp-list"></div>
          </section>
        </div>
      </div>

      <div id="screenDetail" class="mp-screen mp-screen--detail" hidden>
        <div class="mp-sheet__scroll" id="detailSlot"></div>
      </div>
    </div>

    <div class="mp-fab-wrap">
      <button id="observeBtn" class="mp-fab" type="button">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path fill="currentColor" d="M9 4.5c.4-.7 1.1-1.1 1.9-1.1h2.2c.8 0 1.5.4 1.9 1.1l.7 1.2H18c1.7 0 3 1.3 3 3v8c0 1.7-1.3 3-3 3H6c-1.7 0-3-1.3-3-3v-8c0-1.7 1.3-3 3-3h2.3L9 4.5zm3 12.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/>
        </svg>
        <span id="observeLabel"></span>
      </button>
    </div>

    <div id="observeSheet" class="mp-observe" aria-hidden="true">
      <span class="mp-observe__grab" aria-hidden="true"></span>
      <button id="observeClose" class="mp-observe__close" type="button">×</button>
      <div id="observeSlot" class="mp-observe__body"></div>
    </div>
  `;

  const q = (sel) => root.querySelector(sel);
  const tabMissions = q("#tabMissions");
  const tabAround = q("#tabAround");
  const mapSlot = q("#mapSlot");
  const screenList = q("#screenList");
  const screenDetail = q("#screenDetail");
  const detailSlot = q("#detailSlot");
  const paneMissions = q("#paneMissions");
  const paneAround = q("#paneAround");
  const paneTitle = q("#paneTitle");
  const paneCount = q("#paneCount");
  const missionsSpinner = q("#missionsSpinner");
  const aroundSpinner = q("#aroundSpinner");
  const missionsList = q("#missionsList");
  const aroundList = q("#aroundList");
  const observeBtn = q("#observeBtn");
  const observeLabel = q("#observeLabel");
  const observeSheet = q("#observeSheet");
  const observeClose = q("#observeClose");
  const observeSlot = q("#observeSlot");

  let activeTab = "missions";
  let counts = { missions: null, around: null };
  let tabSwitchCb = null;
  let observeCb = null;
  let sheetCloseCb = null;
  let resizeCb = null;
  let detailBackCb = null;

  function syncHead() {
    paneTitle.textContent = t(activeTab === "missions" ? "map.here.title" : "map.around.title");
    const count = counts[activeTab];
    paneCount.hidden = !count;
    paneCount.textContent = count ? String(count) : "";
  }

  function setActiveTab(tab, { notify = true } = {}) {
    if (tab !== "missions" && tab !== "around") return;
    activeTab = tab;

    const isMissions = tab === "missions";
    tabMissions.classList.toggle("is-active", isMissions);
    tabMissions.setAttribute("aria-selected", String(isMissions));
    tabAround.classList.toggle("is-active", !isMissions);
    tabAround.setAttribute("aria-selected", String(!isMissions));
    paneMissions.hidden = !isMissions;
    paneAround.hidden = isMissions;
    showList();
    syncHead();

    // The map keeps its full height on the missions tab, where it *is* the
    // page, and shrinks on "around you", where the species list is what the
    // player came for.
    root.classList.toggle("mp-shell--compact", !isMissions);
    // Leaflet has no idea its container just changed size. Once now, once
    // after the frame the new sizes land on — the first alone has measured a
    // stale height on Safari.
    resizeCb?.();
    requestAnimationFrame(() => resizeCb?.());

    if (notify) tabSwitchCb?.(tab);
  }

  tabMissions.addEventListener("click", () => setActiveTab("missions"));
  tabAround.addEventListener("click", () => setActiveTab("around"));
  observeBtn.addEventListener("click", () => observeCb?.());
  observeClose.addEventListener("click", () => closeObserveSheet());

  // The sheet is deliberately the same height on both screens. Growing it for
  // the detail view resized the map underneath, and a map that re-lays out
  // under your thumb the moment you tap a pin reads as the page reloading.
  // The detail scrolls instead.
  function showList() {
    if (screenDetail.hidden) return;
    screenDetail.hidden = true;
    screenList.hidden = false;
    detailSlot.replaceChildren();
    detailBackCb?.();
  }

  function showDetail(element) {
    detailSlot.replaceChildren(element);
    detailSlot.scrollTop = 0;
    screenList.hidden = true;
    screenDetail.hidden = false;
  }

  function openObserveSheet() {
    observeSheet.setAttribute("aria-hidden", "false");
    observeSheet.classList.add("is-open");
  }

  function closeObserveSheet() {
    if (observeSheet.getAttribute("aria-hidden") === "true") return;
    observeSheet.setAttribute("aria-hidden", "true");
    observeSheet.classList.remove("is-open");
    sheetCloseCb?.();
  }

  /** Replace a list's contents, or stand an illustrated empty state in. */
  function fill(listEl, rows, { icon, text }) {
    listEl.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "mp-empty";
      empty.innerHTML = `<span class="mp-empty__icon" aria-hidden="true"></span><p></p>`;
      empty.querySelector(".mp-empty__icon").textContent = icon;
      empty.querySelector("p").textContent = text;
      listEl.appendChild(empty);
      return;
    }
    for (const row of rows) listEl.appendChild(row);
  }

  function refreshI18n() {
    tabMissions.textContent = t("missions.tab.missions");
    tabAround.textContent = t("missions.tab.aroundYou");
    observeLabel.textContent = t("map.observe");
    observeClose.setAttribute("aria-label", t("common.close"));
    syncHead();
  }
  refreshI18n();

  return {
    element: root,
    mapSlot,
    observeSlot,

    getActiveTab: () => activeTab,
    setActiveTab,
    onTabSwitch(cb) { tabSwitchCb = cb; },
    /** Called whenever the map's container changes size. */
    onResize(cb) { resizeCb = cb; },

    showDetail,
    showList,
    isShowingDetail: () => !screenDetail.hidden,
    /** Fires whenever the detail screen is left, however it was left. */
    onDetailBack(cb) { detailBackCb = cb; },

    setMissionsLoading(on) {
      missionsSpinner.hidden = !on;
      // The spinner replaces the list rather than sitting above it: a stale
      // "you are standing in nothing" under a spinner reads as an answer.
      missionsList.hidden = on;
      if (on) { counts.missions = null; syncHead(); }
    },

    setAroundLoading(on) {
      aroundSpinner.hidden = !on;
      aroundList.hidden = on;
      if (on) { counts.around = null; syncHead(); }
    },

    renderValidMissions(rows, { locating = false } = {}) {
      counts.missions = rows.length;
      syncHead();
      fill(missionsList, rows, locating
        ? { icon: "📍", text: t("map.here.locating") }
        : { icon: "🥾", text: t("map.here.empty") });
    },

    renderAround(rows) {
      counts.around = rows.length;
      syncHead();
      fill(aroundList, rows, { icon: "🌿", text: t("map.around.empty") });
    },

    onObserve(cb) { observeCb = cb; },
    onObserveSheetClose(cb) { sheetCloseCb = cb; },
    openObserveSheet,
    closeObserveSheet,

    refreshI18n,
  };
}
