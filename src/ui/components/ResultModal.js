// src/ui/components/ResultModal.js
import { auth, db } from "../../../firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { addObservationAndDiscovery } from "../../data/observations.js";

export function ResultModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal show result-modal";
  overlay.setAttribute("role", "dialog");

  overlay.innerHTML = `
    <div class="modal-content result">
      <button class="close" aria-label="Close">×</button>

      <!-- LEVEL TOP -->
      <div class="level-wrap at-top">
        <div class="level-line">
          <span>Level <span id="levelFrom">1</span></span>
          <span id="levelToLabel">→ <span id="levelTo">2</span></span>
        </div>
        <div class="progress-rail">
          <div class="progress-bar" id="levelProgress"></div>
        </div>
      </div>

      <div class="result-head">
        <h2 id="resultTitle">Identifying…</h2>
        <!-- Classic indeterminate bar -->
        <div class="loading-track" id="loadingTrack" aria-hidden="true">
          <div class="loading-indeterminate"></div>
        </div>
      </div>

      <div class="result-body">
        <div class="user-photos center" id="userPhotos"></div>

        <div class="result-points">
          <div id="obsBadge" class="points-badge common-points">
            <span class="label">Observation</span>
            <span class="value">+<span id="pointsCounter">0</span></span>
          </div>
          <div class="details" id="pointsDetails"></div>
        </div>

        <div class="badges big" id="badges" style="display:none"></div>

        <div class="result-total" id="finalTotalWrap" style="display:none">
          <div class="big">Total: <strong><span id="finalTotal">0</span></strong> pts</div>
        </div>
      </div>

      <div class="result-actions">
        <button class="primary" id="doneBtn" type="button">Done</button>
      </div>
    </div>
  `;

  overlay.querySelector(".close").addEventListener("click", () => overlay.remove());
  overlay.querySelector("#doneBtn").addEventListener("click", () => overlay.remove());

  return {
    el: overlay,

    async initLoading({ photos, currentTotalPoints }) {
      const { fromLevel, fromPct, nextLevel } = calcFromLevel(currentTotalPoints || 0);
      qs("#levelFrom").textContent = fromLevel;
      qs("#levelTo").textContent = nextLevel;     // show current → next while loading
      qs("#levelToLabel").style.opacity = 0.9;
      qs("#levelProgress").style.width = `${fromPct}%`;

      const photosEl = qs("#userPhotos");
      photosEl.innerHTML = (photos || []).map(url =>
        `<div class="shot"><img src="${url}" alt="Your photo" loading="lazy"/></div>`
      ).join("");

      qs("#resultTitle").textContent = "Identifying…";
      qs("#loadingTrack").style.display = "block";           // show loading bar
      qs("#badges").style.display = "none";                  // hide badges until result
    },

    async showResult({ identify, points, lat, lon, plantnetImageCode }) {
      // Stop loader
      qs("#loadingTrack").style.display = "none";

      const speciesName = identify?.name || "Unknown species";
      qs("#resultTitle").textContent = speciesName;

      // Current total for level animation
      const user = auth.currentUser;
      let currentTotal = 0;
      if (user) {
        try {
          const ref = doc(db, "users", user.uid);
          const snap = await getDoc(ref);
          currentTotal = Number(snap.data()?.total_points ?? 0);
        } catch {}
      }

      // Observation points (base) + details
      const baseTotal = Number(points?.total ?? 0);
      const detail = (points?.detail && typeof points.detail === "object") ? points.detail : {};
      await animateObservation({
        total: baseTotal,
        detail,
        counterEl: qs("#pointsCounter"),
        detailsEl: qs("#pointsDetails"),
        badgeEl: qs("#obsBadge"),
      });

      // Mission bonus?
      const missionHit = await isInMissionsList(speciesName);
      const badgeQueue = [];
      if (missionHit) badgeQueue.push({ kind: "mission", emoji: "🎯", label: "Mission species", bonus: 500 });

      // Save observation (+ discovery if new)
      let discoveryBonus = 0;
      if (user) {
        const { discoveryBonus: got } = await addObservationAndDiscovery({
          userId: user.uid,
          speciesName,
          lat, lon,
          plantnetImageCode,
          plantnet_identify_score: Number(identify?.score ?? 0),
          gbif_id: identify?.gbif_id ?? null,
          pointsMap: detail,
          total_points: baseTotal,
          extraBonus: missionHit ? 500 : 0,
        });
        discoveryBonus = got;
      }
      if (discoveryBonus > 0) badgeQueue.push({ kind: "new", emoji: "🆕", label: "New species", bonus: 500 });

      // Reveal badges now (they were hidden during loading)
      const badgesEl = qs("#badges");
      badgesEl.style.display = "flex";
      let finalTotal = baseTotal;
      for (const b of badgeQueue) {
        await showBadge(badgesEl, b);
        finalTotal += b.bonus;
      }

      // Show final total
      qs("#finalTotal").textContent = String(finalTotal);
      qs("#finalTotalWrap").style.display = "block";

      // Level progress final animation (and correct “next” → final)
      const { fromLevel, fromPct } = calcFromLevel(currentTotal);
      const { toLevel, toPct }   = calcToLevel(currentTotal + finalTotal);
      qs("#levelFrom").textContent = fromLevel;
      qs("#levelTo").textContent   = toLevel;     // final level value after scoring
      qs("#levelToLabel").style.opacity = toLevel > fromLevel ? 1 : 0.6;
      await animateProgress(qs("#levelProgress"), fromPct, toPct);
      if (toLevel > fromLevel) pulseLevelUp(overlay);
    }
  };
}

/* -------- Helpers -------- */
const qs = (sel, root=document) => root.querySelector(sel);

function calcFromLevel(total) {
  const L = Math.floor(1 + total / 11000);
  const prev = (L - 1) * 11000, next = L * 11000;
  const pct = Math.round(((total - prev) / (next - prev)) * 100);
  return { fromLevel: L, nextLevel: L + 1, fromPct: clamp01(pct) };
}
function calcToLevel(total) {
  const L = Math.floor(1 + total / 11000);
  const prev = (L - 1) * 11000, next = L * 11000;
  const pct = Math.round(((total - prev) / (next - prev)) * 100);
  return { toLevel: L, toPct: clamp01(pct) };
}
function clamp01(v) { return Math.max(0, Math.min(100, v)); }

async function animateObservation({ total, detail, counterEl, detailsEl, badgeEl }) {
  const entries = Object.entries(detail || {});
  detailsEl.innerHTML = "";

  const duration = 1800;
  const start = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 3);

  const revealTimes = entries.map((_, i) => (i + 1) / (entries.length || 1) * duration);
  let revealed = 0;

  return new Promise(resolve => {
    function frame(ts) {
      const t = Math.min(1, (ts - start) / duration);
      const val = Math.round(total * ease(t));
      counterEl.textContent = String(val);
      upgradeBadgeBy(val, badgeEl);

      while (revealed < revealTimes.length && (ts - start) >= revealTimes[revealed]) {
        const [k, v] = entries[revealed];
        const line = document.createElement("div");
        line.className = "detail-line";
        line.innerHTML = `<span>${prettyKey(k)}</span><span>+${v}</span>`;
        detailsEl.appendChild(line);
        revealed++;
      }

      if (t < 1) requestAnimationFrame(frame);
      else {
        for (; revealed < entries.length; revealed++) {
          const [k, v] = entries[revealed];
          const line = document.createElement("div");
          line.className = "detail-line";
          line.innerHTML = `<span>${prettyKey(k)}</span><span>+${v}</span>`;
          detailsEl.appendChild(line);
        }
        counterEl.textContent = String(total);
        upgradeBadgeBy(total, badgeEl);
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

function prettyKey(k) {
  const map = {
    base: "Species observation",
    mission: "Mission bonus",
    mission_bonus: "Mission bonus",
    novelty: "New species bonus",
    new_species: "New species bonus",
  };
  return map[k] || k.replace(/[_-]+/g, " ").replace(/\b\w/g, m => m.toUpperCase());
}

function getRarity(val) {
  if (val >= 1500) return "legendary-points";
  if (val >= 1000) return "epic-points";
  if (val >= 500)  return "rare-points";
  return "common-points";
}

function upgradeBadgeBy(val, el) {
  const next = getRarity(val);
  const prev = el.dataset.rarity || "";

  if (prev === next) return; // no change → no pop

  // store new rarity
  el.dataset.rarity = next;

  // swap classes to the new rarity
  el.classList.remove("common-points", "rare-points", "epic-points", "legendary-points");
  el.classList.add(next);

  // trigger a quick pop animation (restarts every upgrade)
  el.classList.remove("points-pop");
  // force reflow so the animation re-triggers
  // eslint-disable-next-line no-unused-expressions
  el.offsetHeight;
  el.classList.add("points-pop");
}


function animateProgress(el, fromPct, toPct) {
  const duration = 900, start = performance.now();
  return new Promise(res => {
    function frame(ts) {
      const t = Math.min(1, (ts - start) / duration);
      const v = Math.round(fromPct + (toPct - fromPct) * (1 - Math.pow(1 - t, 2)));
      el.style.width = `${v}%`;
      if (t < 1) requestAnimationFrame(frame); else res();
    }
    requestAnimationFrame(frame);
  });
}

async function isInMissionsList(name) {
  try {
    const user = auth.currentUser;
    if (!user) return false;
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const list = snap.data()?.missions_list || [];
    return list.some(m => (m?.name || m?.speciesName || "").toLowerCase() === name.toLowerCase());
  } catch { return false; }
}

function pulseLevelUp(overlay) {
  const box = overlay.querySelector(".modal-content.result");
  box.classList.add("levelup");
  setTimeout(() => box.classList.remove("levelup"), 1200);
}

function showBadge(container, badge) {
  return new Promise(r => {
    requestAnimationFrame(() => {
      node.classList.add("in");
      setTimeout(r, 500);
    });
    const node = document.createElement("div");
    node.className = "badge big";
    node.innerHTML = `<span class="icon">${badge.emoji}</span><span class="txt">${badge.label}</span><span class="add">+${badge.bonus}</span>`;
    container.appendChild(node);
  });
}
