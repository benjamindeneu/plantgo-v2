// src/ui/components/ChallengeScreen.view.js
import { t } from "../../language/i18n.js";
import { isSpeciesFound } from "../../data/activeChallenge.js";

/**
 * The challenge screen inside the map sheet.
 *
 * The sheet is a third of a phone screen, so this is built the way the other
 * screens in it are: a compact head, then one scrolling list. The standings
 * come first — where you are against everyone else is the question the screen
 * is opened to answer — and a species hunt's checklist follows underneath.
 *
 * The species rows are not built here. They are the same `SpeciesRow` the
 * missions list uses, passed in by the controller, so tapping one opens the
 * same detail screen rather than a second kind of card.
 */
export function createChallengeScreenView({ onClose } = {}) {
  const root = document.createElement("div");
  root.className = "mp-chal";
  root.innerHTML = `
    <div class="mp-chal__head">
      <button class="mp-chal__code" type="button" title="">
        <span class="mp-chal__code-value"></span>
        <svg class="mp-chal__code-icon" viewBox="0 0 24 24" width="13" height="13" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      </button>
      <span class="mp-chal__clock"></span>
    </div>

    <section class="mp-chal__section">
      <h3 class="mp-chal__label" id="chalBoardLabel"></h3>
      <ol class="mp-lead" id="chalBoard"></ol>
    </section>

    <section class="mp-chal__section" id="chalHunt" hidden>
      <h3 class="mp-chal__label"></h3>
      <div class="mp-list" id="chalSpecies"></div>
    </section>

    <div class="mp-chal__foot" id="chalFoot" hidden>
      <button class="mp-chal__close" type="button" id="chalClose"></button>
    </div>
  `;

  const q = (sel) => root.querySelector(sel);
  const codeBtn = q(".mp-chal__code");
  const codeValue = q(".mp-chal__code-value");
  const clockEl = q(".mp-chal__clock");
  const huntSection = q("#chalHunt");
  const huntLabel = q("#chalHunt .mp-chal__label");
  const speciesList = q("#chalSpecies");
  const boardLabel = q("#chalBoardLabel");
  const board = q("#chalBoard");
  const foot = q("#chalFoot");
  const closeBtn = q("#chalClose");

  let challenge = null;
  let myUid = null;
  let rows = [];
  let ended = false;

  codeBtn.addEventListener("click", async () => {
    if (!challenge?.code) return;
    try {
      await navigator.clipboard.writeText(challenge.code);
      codeBtn.classList.add("is-copied");
      codeValue.textContent = t("common.copied");
      setTimeout(() => {
        codeBtn.classList.remove("is-copied");
        codeValue.textContent = challenge?.code ?? "";
      }, 1500);
    } catch { /* clipboard blocked — the code is still on screen to read */ }
  });

  closeBtn.addEventListener("click", () => onClose?.());

  /** mm:ss, and never a negative clock. */
  function fmt(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  function renderClock() {
    if (!challenge) return;
    if (ended || !challenge.endAtMs) {
      clockEl.textContent = t("challenge.active.ended");
      clockEl.classList.add("is-ended");
    } else {
      clockEl.textContent = fmt(challenge.endAtMs - Date.now());
      clockEl.classList.remove("is-ended");
    }
  }

  function renderBoard() {
    board.replaceChildren();

    if (!rows.length) {
      const empty = document.createElement("li");
      empty.className = "mp-lead__empty";
      empty.textContent = t("challenge.leaderboard.empty");
      board.appendChild(empty);
      return;
    }

    const unit = challenge?.type === "species_hunt"
      ? t("challenge.speciesHunt.scoreLabel")
      : t("result.ptsShort");
    const top = Math.max(...rows.map((r) => r.score || 0), 1);

    rows.forEach((r, i) => {
      const li = document.createElement("li");
      li.className = "mp-lead__row";
      if (i < 3) li.classList.add(`mp-lead__row--top${i + 1}`);
      if (myUid && r.uid === myUid) li.classList.add("is-me");

      const rank = document.createElement("span");
      rank.className = "mp-lead__rank";
      rank.textContent = i < 3 ? "✿" : `${i + 1}`;

      const name = document.createElement("span");
      name.className = "mp-lead__name";
      name.textContent = r.username || "—";

      const score = document.createElement("span");
      score.className = "mp-lead__score";
      score.textContent = `${r.score || 0} ${unit}`;

      const rail = document.createElement("span");
      rail.className = "mp-lead__rail";
      const fill = document.createElement("span");
      fill.className = "mp-lead__fill";
      fill.style.width = `${Math.round(((r.score || 0) / top) * 100)}%`;
      rail.appendChild(fill);

      li.append(rank, name, score, rail);
      board.appendChild(li);
    });
  }

  function refreshI18n() {
    codeBtn.title = t("common.copy");
    huntLabel.textContent = t("challenge.speciesHunt.checklistTitle");
    boardLabel.textContent = t("challenge.leaderboard");
    closeBtn.textContent = t("challenge.active.close");
    renderClock();
    renderBoard();
  }

  refreshI18n();

  return {
    element: root,

    setChallenge(next, { isEnded = false } = {}) {
      challenge = next;
      ended = isEnded;
      codeValue.textContent = next?.code ?? "";
      root.classList.toggle("mp-chal--hunt", next?.type === "species_hunt");
      foot.hidden = !isEnded;
      renderClock();
      renderBoard();
    },

    setMyUid(uid) { myUid = uid || null; },

    setLeaderboard(next = []) {
      rows = next;
      renderBoard();
    },

    /**
     * @param {HTMLElement[]} speciesRows rows already built by the controller
     * @param {{found:number,total:number}} progress
     */
    setChecklist(speciesRows, progress) {
      huntSection.hidden = !speciesRows.length;
      speciesList.replaceChildren(...speciesRows);
      huntLabel.textContent = speciesRows.length
        ? `${t("challenge.speciesHunt.checklistTitle")} · ${progress.found}/${progress.total}`
        : t("challenge.speciesHunt.checklistTitle");
    },

    /** Ticked once a second by the controller while the clock runs. */
    tick(isEndedNow) {
      ended = isEndedNow;
      foot.hidden = !isEndedNow;
      renderClock();
    },

    refreshI18n,
  };
}

/** Marks a row the player has already found, for the hunt checklist. */
export function markFound(rowEl, species, foundSpecies, foundGbifIds) {
  if (isSpeciesFound(species, foundSpecies, foundGbifIds)) rowEl.classList.add("mp-row--found");
  return rowEl;
}
