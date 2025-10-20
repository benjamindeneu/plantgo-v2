// src/ui/components/ResultModal.js
import { auth, db } from "../../../firebase-config.js";
import {
  doc, getDoc, collection, getDocs
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { addObservationAndDiscovery } from "../../data/observations.js";

export function ResultModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal show result-modal";
  overlay.setAttribute("role", "dialog");

  overlay.innerHTML = `
    <div class="modal-content result">
      <button class="close" aria-label="Close">×</button>

      <!-- Level at top -->
      <div class="level-wrap at-top">
        <div class="level-line">
          <span>Level <span id="levelFrom">1</span></span>
          <span id="levelToLabel">→ <span id="levelTo">1</span></span>
        </div>
        <div class="progress-rail">
          <div class="progress-bar" id="levelProgress"></div>
        </div>
      </div>

      <div class="result-head">
        <h2 id="resultTitle">Identifying…</h2>
        <div class="loading-strip" id="loadingStrip"><div class="loading-bar"></div></div>
      </div>

      <div class="result-body">
        <div class="user-photos" id="userPhotos"></div>

        <div class="result-points">
          <div class="big"><span class="muted">Observation points </span>+<span id="pointsCounter">0</span></div>
          <div class="details" id="pointsDetails"></div>
        </div>

        <div class="badges" id="badges"></div>

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

    // Initialize with current user level/progress and photo previews
    async initLoading({ photos, currentTotalPoints }) {
      const { fromLevel, fromPct } = calcFromLevel(currentTotalPoints || 0);
      overlay.querySelector("#levelFrom").textContent = fromLevel;
      overlay.querySelector("#levelTo").textContent = fromLevel;
      overlay.querySelector("#levelToLabel").style.opacity = 0.5;
      overlay.querySelector("#levelProgress").style.width = `${fromPct}%`;

      // Photos
      const photosEl = overlay.querySelector("#userPhotos");
      photosEl.innerHTML = (photos || []).map(url => `
        <div class="shot"><img src="${url}" alt="Your photo" loading="lazy"/></div>
      `).join("");

      overlay.querySelector("#resultTitle").textContent = "Identifying…";
      overlay.querySelector("#loadingStrip").style.display = "block";
      overlay.querySelector(".result-body").style.opacity = "0.9";
    },

    /**
     * Show full result flow:
     * 1) Stop loader
     * 2) Animate observation points & detail lines
     * 3) Compute bonuses (mission/new), reveal badges (+500 each)
     * 4) Save observation (+discovery if needed) and increment user's total_points
     * 5) Animate level progress to final and pulse if level-up
     */
    async showResult({
      identify,           // { name, gbif_id, score, raw }
      points,             // { total, detail:{} }
      lat, lon,           // needed to save observation
      plantnetImageCode,  // extracted from raw
      photoCount = 0,     // for possible future bonuses
    }) {
      overlay.querySelector("#loadingStrip").style.display = "none";
      overlay.querySelector(".result-body").style.opacity = "1";
      const speciesName = identify?.name || "Unknown species";
      overlay.querySelector("#resultTitle").textContent = speciesName;

      // Read user's current total points (for level animation)
      const user = auth.currentUser;
      let currentTotal = 0;
      if (user) {
        try {
          const ref = doc(db, "users", user.uid);
          const snap = await getDoc(ref);
          currentTotal = Number(snap.data()?.total_points ?? 0);
        } catch {}
      }

      // 2) Observation points animation (backend base points only)
      const baseTotal = Number(points?.total ?? 0);
      const detail = (points?.detail && typeof points.detail === "object") ? points.detail : {};
      await animateObservation({ total: baseTotal, detail, counterEl: $("#pointsCounter"), detailsEl: $("#pointsDetails", overlay) });

      // 3) Compute badges (🎯 mission; 🆕 discovery)
      const missionHit = await isInMissionsList(speciesName);
      // Discovery will be determined/saved in step 4; for animation, queue it and reveal after saving.
      const badgesEl = $("#badges", overlay);
      const badgeQueue = [];
      if (missionHit) badgeQueue.push({ kind: "mission", emoji: "🎯", label: "Mission species", bonus: 500 });

      // 4) Save observation & (if new) discovery; update user's total_points (includes bonuses)
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
          extraBonus: missionHit ? 500 : 0, // add mission bonus into user's total_points
        });
        discoveryBonus = got;
      }
      if (discoveryBonus > 0) badgeQueue.push({ kind: "new", emoji: "🆕", label: "New species", bonus: 500 });

      // Reveal badges one by one and tally to final total
      let finalTotal = baseTotal;
      for (const b of badgeQueue) {
        await showBadge(badgesEl, b);
        finalTotal += b.bonus;
      }

      // Display final total
      $("#finalTotal", overlay).textContent = String(finalTotal);
      $("#finalTotalWrap", overlay).style.display = "block";

      // 5) Level progress from initial → after all bonuses
      const afterTotal = currentTotal + finalTotal + 0; // we incremented user total via addObservationAndDiscovery already; animation just mirrors the end state
      const { fromLevel, fromPct } = calcFromLevel(currentTotal);
      const { toLevel, toPct } = calcToLevel(afterTotal);
      $("#levelFrom", overlay).textContent = fromLevel;
      $("#levelTo", overlay).textContent = toLevel;
      $("#levelToLabel", overlay).style.opacity = toLevel > fromLevel ? 1 : 0.5;
      await animateProgress($("#levelProgress", overlay), fromPct, toPct);

      if (toLevel > fromLevel) pulseLevelUp(overlay);
    }
  };
}

/* ---------- helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);

function calcFromLevel(total) {
  const L = Math.floor(1 + total / 11000);
  const prev = (L - 1) * 11000, next = L * 11000;
  const pct = Math.round(((total - prev) / (next - prev)) * 100);
  return { fromLevel: L, fromPct: Math.max(0, Math.min(100, pct)) };
}
function calcToLevel(total) {
  const L = Math.floor(1 + total / 11000);
  const prev = (L - 1) * 11000, next = L * 11000;
  const pct = Math.round(((total - prev) / (next - prev)) * 100);
  return { toLevel: L, toPct: Math.max(0, Math.min(100, pct)) };
}

async function animateObservation({ total, detail, counterEl, detailsEl }) {
  const entries = Object.entries(detail || {});
  // Show detail lines as we count up
  detailsEl.innerHTML = "";
  const duration = 1200;
  const start = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 3);

  // schedule reveals
  const revealTimes = entries.map((_, i) => (i + 1) / (entries.length || 1) * duration);
  let revealed = 0;

  return new Promise(resolve => {
    function frame(ts) {
      const t = Math.min(1, (ts - start) / duration);
      const val = Math.round(total * ease(t));
      counterEl.textContent = String(val);

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
        // finalize
        for (; revealed < entries.length; revealed++) {
          const [k, v] = entries[revealed];
          const line = document.createElement("div");
          line.className = "detail-line";
          line.innerHTML = `<span>${prettyKey(k)}</span><span>+${v}</span>`;
          detailsEl.appendChild(line);
        }
        counterEl.textContent = String(total);
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

function prettyKey(k) {
  if (!k) return "points";
  const known = {
    base: "Species observation",
    mission: "Mission bonus",
    mission_bonus: "Mission bonus",
    novelty: "New species bonus",
    new_species: "New species bonus",
  };
  return known[k] || k.replace(/[_-]+/g, " ").replace(/\b\w/g, m => m.toUpperCase());
}

function animateProgress(el, fromPct, toPct) {
  const duration = 900, start = performance.now();
  return new Promise(resolve => {
    function frame(ts) {
      const t = Math.min(1, (ts - start) / duration);
      const v = Math.round(fromPct + (toPct - fromPct) * (1 - Math.pow(1 - t, 2)));
      el.style.width = `${v}%`;
      if (t < 1) requestAnimationFrame(frame); else resolve();
    }
    requestAnimationFrame(frame);
  });
}

async function isInMissionsList(speciesName) {
  try {
    const user = auth.currentUser;
    if (!user) return false;
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const missions = snap.data()?.missions_list || [];
    return missions.some(m => (m?.name || m?.speciesName || "").toLowerCase() === speciesName.toLowerCase());
  } catch { return false; }
}

function pulseLevelUp(overlay) {
  const box = overlay.querySelector(".modal-content.result");
  box.classList.add("levelup");
  setTimeout(() => box.classList.remove("levelup"), 1200);
}

function showBadge(container, badge) {
  return new Promise(r => {
    const node = document.createElement("div");
    node.className = "badge";
    node.textContent = `${badge.emoji} ${badge.label}  +${badge.bonus}`;
    container.appendChild(node);
    requestAnimationFrame(() => { node.classList.add("in"); setTimeout(r, 250); });
  });
}
