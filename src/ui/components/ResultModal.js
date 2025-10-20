// src/ui/components/ResultModal.js
// Pretty, animated modal for identify results

// Firebase (config is NOT in src)
import { auth, db } from "../../../firebase-config.js";
import {
  doc, getDoc, collection, getDoc as getDocDirect
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

export function ResultModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal show result-modal";
  overlay.setAttribute("role", "dialog");

  overlay.innerHTML = `
    <div class="modal-content result">
      <button class="close" aria-label="Close">×</button>
      <div class="result-head">
        <h2 id="resultTitle">Identifying…</h2>
        <div class="loading-strip" id="loadingStrip"><div class="loading-bar"></div></div>
      </div>

      <div class="result-body">
        <div class="result-points">
          <div class="big">+<span id="pointsCounter">0</span> pts</div>
          <div class="details" id="pointsDetails"></div>
        </div>

        <div class="level-wrap">
          <div class="level-line">
            <span>Level <span id="levelFrom">1</span></span>
            <span id="levelToLabel">→ <span id="levelTo">1</span></span>
          </div>
          <div class="progress-rail">
            <div class="progress-bar" id="levelProgress"></div>
          </div>
        </div>

        <div class="badges" id="badges"></div>
      </div>

      <div class="result-actions">
        <button class="primary" id="doneBtn" type="button">Done</button>
      </div>
    </div>
  `;

  overlay.querySelector(".close").addEventListener("click", () => overlay.remove());
  overlay.querySelector("#doneBtn").addEventListener("click", () => overlay.remove());

  // Public API
  return {
    el: overlay,
    showLoading(title = "Identifying…") {
      overlay.querySelector("#resultTitle").textContent = title;
      overlay.querySelector("#loadingStrip").style.display = "block";
      overlay.querySelector(".result-body").style.opacity = "0.6";
    },
    async showResult({ identify, points }) {
      // Stop loader
      overlay.querySelector("#loadingStrip").style.display = "none";
      overlay.querySelector(".result-body").style.opacity = "1";

      const speciesName = identify?.name || "Unknown species";

      // Read current total_points from Firestore to animate level properly
      const user = auth.currentUser;
      let currentTotal = 0;
      if (user) {
        try {
          const ref = doc(db, "users", user.uid);
          const snap = await getDoc(ref);
          currentTotal = Number(snap.data()?.total_points ?? 0);
        } catch {}
      }

      // Points animation
      const detail = (points?.detail && typeof points.detail === "object") ? points.detail : {};
      const lines = Object.entries(detail).map(([k, v]) => [prettyKey(k), Number(v) || 0]);
      const total = Number(points?.total ?? 0);
      const counterEl = overlay.querySelector("#pointsCounter");
      const detailsEl = overlay.querySelector("#pointsDetails");

      // Clear text and set title
      overlay.querySelector("#resultTitle").textContent = speciesName;

      // Level animation prep
      const { fromLevel, toLevel, fromPct, toPct } = calcLevelTransition(currentTotal, total);

      overlay.querySelector("#levelFrom").textContent = fromLevel;
      overlay.querySelector("#levelTo").textContent = toLevel;
      overlay.querySelector("#levelToLabel").style.opacity = toLevel > fromLevel ? "1" : "0.5";
      const progressEl = overlay.querySelector("#levelProgress");
      progressEl.style.width = `${fromPct}%`;

      // Animate counter + reveal lines
      await animatePoints({ total, lines, counterEl, detailsEl });

      // Animate progress bar to final
      await animateProgress(progressEl, fromPct, toPct);

      // Level-up pop
      if (toLevel > fromLevel) levelUpBurst(overlay);

      // Bonus badges (mission / new species)
      const badgesEl = overlay.querySelector("#badges");
      const bonuses = await computeBonuses(speciesName);
      await animateBadges(badgesEl, bonuses);
    }
  };
}

/* ---------- helpers ---------- */

function prettyKey(k) {
  if (!k) return "points";
  const map = {
    base: "Species observation",
    mission: "Mission bonus",
    mission_bonus: "Mission bonus",
    novelty: "New species bonus",
    new_species: "New species bonus",
  };
  if (map[k]) return map[k];
  return k.replace(/[_-]+/g, " ").replace(/\b\w/g, m => m.toUpperCase());
}

function calcLevelTransition(currentTotal, add) {
  const LV = v => Math.floor(1 + v / 11000);
  const fromLevel = LV(currentTotal);
  const after = currentTotal + (add || 0);
  const toLevel = LV(after);
  const pct = (level, total) => {
    const prev = (level - 1) * 11000;
    const next = level * 11000;
    const ratio = Math.max(0, Math.min(1, (total - prev) / (next - prev)));
    return Math.round(ratio * 100);
  };
  const fromPct = pct(fromLevel, currentTotal);
  const toPct   = pct(toLevel, after);
  return { fromLevel, toLevel, fromPct, toPct };
}

async function animatePoints({ total, lines, counterEl, detailsEl }) {
  // Count up total over ~1.2s regardless of size (eases feel)
  const duration = 1200;
  const start = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 3);
  const target = total;

  // Reveal lines one by one spaced evenly across duration
  detailsEl.innerHTML = "";
  const lineSlots = lines.length || 1;
  const revealTimes = lines.map((_, i) => (i + 1) / lineSlots * duration);

  return new Promise(resolve => {
    let revealed = 0;
    function frame(ts) {
      const t = Math.min(1, (ts - start) / duration);
      const val = Math.round(target * ease(t));
      counterEl.textContent = String(val);

      while (revealed < revealTimes.length && (ts - start) >= revealTimes[revealed]) {
        const [label, pts] = lines[revealed];
        const line = document.createElement("div");
        line.className = "detail-line";
        line.innerHTML = `<span>${label}</span><span>+${pts}</span>`;
        detailsEl.appendChild(line);
        revealed++;
      }

      if (t < 1) requestAnimationFrame(frame);
      else {
        // Ensure all lines visible
        for (; revealed < lines.length; revealed++) {
          const [label, pts] = lines[revealed];
          const line = document.createElement("div");
          line.className = "detail-line";
          line.innerHTML = `<span>${label}</span><span>+${pts}</span>`;
          detailsEl.appendChild(line);
        }
        counterEl.textContent = String(target);
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

function animateProgress(el, fromPct, toPct) {
  const duration = 900;
  const start = performance.now();
  return new Promise(resolve => {
    function frame(ts) {
      const t = Math.min(1, (ts - start) / duration);
      const cur = Math.round(fromPct + (toPct - fromPct) * (1 - Math.pow(1 - t, 2)));
      el.style.width = `${cur}%`;
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

function levelUpBurst(overlay) {
  // Simple tasteful pulse + confetti-like sparkles
  overlay.querySelector(".modal-content.result").classList.add("levelup");
  setTimeout(() => {
    overlay.querySelector(".modal-content.result").classList.remove("levelup");
  }, 1400);
}

async function computeBonuses(speciesName) {
  const badges = [];

  // Mission badge: if species in user's missions_list (cached earlier)
  try {
    const user = auth.currentUser;
    if (user) {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      const missions = snap.data()?.missions_list || [];
      const found = missions.find(m => (m?.name || m?.speciesName || "").toLowerCase() === speciesName.toLowerCase());
      if (found) badges.push({ kind: "mission", label: "Mission species", emoji: "🎯" });
    }
  } catch {}

  // New species badge: if not in users/{uid}/discoveries
  try {
    const user = auth.currentUser;
    if (user) {
      const dref = doc(db, "users", user.uid, "discoveries", speciesName);
      const dsnap = await getDocDirect(dref);
      if (!dsnap.exists()) badges.push({ kind: "new", label: "New species", emoji: "🆕" });
    }
  } catch {}

  return badges;
}

async function animateBadges(container, badges) {
  container.innerHTML = "";
  for (const b of badges) {
    const node = document.createElement("div");
    node.className = "badge";
    node.textContent = `${b.emoji} ${b.label}`;
    container.appendChild(node);
    await wait(250);
    node.classList.add("in");
    await wait(200);
  }
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
