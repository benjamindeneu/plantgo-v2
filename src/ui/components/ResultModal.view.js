export function createResultModalView() {
  const overlay = document.createElement("div");
  overlay.className = "modal show result-modal";
  overlay.setAttribute("role", "dialog");

  overlay.innerHTML = `
    <div class="modal-content result">
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
        <div id="speciesNameLine" class="muted"></div>
        <div id="speciesVernacularNameLine" class="muted"></div>
        <div class="loading-track" id="loadingTrack" aria-hidden="true">
          <div class="loading-indeterminate"></div>
        </div>
      </div>

      <div class="result-body">
        <h4>Your observation:</h4>
        <div class="user-photos center" id="userPhotos"></div>

        <div class="result-points">
          <div class="muted" style="margin-bottom:6px; text-align:center;">Observation points:</div>

          <div class="points-stack" style="display:flex; flex-direction:column; align-items:center;">
            <div id="obsBadge"
                class="points-badge common-points"
                data-rarity="common-points">
                <span class="value"><span id="pointsCounter">0</span></span>
            </div>
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
  overlay.querySelector("#doneBtn").addEventListener("click", () => overlay.remove());

  const qs = (sel) => overlay.querySelector(sel);

  /* ---------- helpers (visual only) ---------- */
  const clamp01 = (v) => Math.max(0, Math.min(100, v));
  const prettyKey = (k) => {
    const map = {
      base: "Species observation",
      mission: "Mission bonus",
      mission_bonus: "Mission bonus",
      novelty: "New species bonus",
      new_species: "New species bonus",
    };
    return map[k] || k.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  };

  // rarity helpers
  const getRarity = (val) => (val >= 1500 ? "legendary-points" :
                               val >= 1000 ? "epic-points" :
                               val >= 500  ? "rare-points" : "common-points");
  const rarityText = (cls) =>
    cls === "legendary-points" ? "Legendary" :
    cls === "epic-points"      ? "Epic" :
    cls === "rare-points"      ? "Rare" : "Common";

  function getEaseFn(name) {
    switch ((name || "linear").toLowerCase()) {
      case "easeout":
      case "ease-out":
        return (t) => 1 - Math.pow(1 - t, 3);
      case "linear":
      default:
        return (t) => t;
    }
  }

  function setBadgeRarityClass(el, rarity) {
    // Always remove and re-add to ensure CSS takes effect
    el.classList.remove("common-points", "rare-points", "epic-points", "legendary-points");
    el.dataset.rarity = rarity;
    el.classList.add(rarity);
  }

  function upgradeBadgeBy(val, el) {
    const next = getRarity(val);
    const prev = el.dataset.rarity || "";
    if (prev === next) return;
    setBadgeRarityClass(el, next);
    el.classList.remove("points-pop");
    void el.offsetWidth; // reflow
    el.classList.add("points-pop");
  }

  function animateProgress(el, fromPct, toPct, options = {}) {
    const duration = 900, start = performance.now();
    const ease = getEaseFn(options.ease || "linear");
    return new Promise((res) => {
      function frame(ts) {
        const t = Math.min(1, (ts - start) / duration);
        const e = ease(t);
        const v = Math.round(fromPct + (toPct - fromPct) * e);
        el.style.width = `${v}%`;
        if (t < 1) requestAnimationFrame(frame); else res();
      }
      requestAnimationFrame(frame);
    });
  }

  function showBadge(container, badge) {
    return new Promise((r) => {
      const node = document.createElement("div");
      node.className = "badge big";
      if (badge.rawHTML) {
        node.innerHTML = badge.label;
      } else {
        node.innerHTML = `<span class="icon">${badge.emoji}</span><span class="txt">${badge.label}</span>${badge.bonus != null ? `<span class="add">+${badge.bonus}</span>` : ""}`;
      }
      container.appendChild(node);
      requestAnimationFrame(() => {
        node.classList.add("in");
        setTimeout(r, 500);
      });
    });
  }

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

  /* ---------- public view API ---------- */
  return {
    el: overlay,

    async initLoading({ photos, currentTotalPoints }) {
      const { fromLevel, fromPct, nextLevel } = calcFromLevel(currentTotalPoints || 0);
      qs("#levelFrom").textContent = fromLevel;
      qs("#levelTo").textContent = nextLevel;
      qs("#levelToLabel").style.opacity = 0.9;
      qs("#levelProgress").style.width = `${fromPct}%`;

      const photosEl = qs("#userPhotos");
      photosEl.innerHTML = (photos || [])
        .map((url) => `<div class="shot"><img src="${url}" alt="Your photo" loading="lazy"/></div>`)
        .join("");

      qs("#resultTitle").textContent = "Identifying…";
      qs("#speciesNameLine").textContent = "";
      qs("#speciesVernacularNameLine").textContent = "";
      qs("#loadingTrack").style.display = "block";

      // Ensure starting rarity class is applied (so color shows immediately)
      const obsBadge = qs("#obsBadge");
      setBadgeRarityClass(obsBadge, "common-points");

      qs("#badges").style.display = "none";
    },

    /**
     * Pure UI: needs already computed data.
     */
    async showResultUI({ speciesName, speciesVernacularName, baseTotal, detail, badges, currentTotalBefore, finalTotal }) {
      const loading = qs("#loadingTrack");
      const title = qs("#resultTitle");
      const speciesLine = qs("#speciesNameLine");
      const speciesVernacularLine = qs("#speciesVernacularNameLine");
      const badgeEl = qs("#obsBadge");
      const counterEl = qs("#pointsCounter");
      const valueWrapper = counterEl.parentElement; // .value
      const detailsEl = qs("#pointsDetails");
      const badgesEl = qs("#badges");

      loading.style.display = "none";
      title.textContent = "New observation of :";
      speciesLine.textContent = speciesName || "Unknown species";
      speciesVernacularLine.textContent = speciesVernacularName || "No common name";

      // Animate observation points + detail lines (keeps rarity classes in sync)
      await animateObservation(
        { total: baseTotal, detail, counterEl, detailsEl, badgeEl },
        { ease: "linear" }
      );

      // After the counter is done, inject rarity label under the number within the SAME badge
      const rarityClass = getRarity(baseTotal);
      const rarityLabel = rarityText(rarityClass);
      setBadgeRarityClass(badgeEl, rarityClass); // ensure final class is on
      // avoid duplicating label if re-used
      valueWrapper.innerHTML = `<span id="pointsCounter">${counterEl.textContent}</span><br><span class="rarity-label">${rarityLabel}</span>`;

      // Mission/discovery badges
      if (badges && badges.length) {
        badgesEl.style.display = "block";
        for (const b of badges) await showBadge(badgesEl, b);
      }

      // Final total
      qs("#finalTotal").textContent = String(finalTotal);
      qs("#finalTotalWrap").style.display = "block";

      // Level progress animation (from current to current+final)
      const { fromPct } = calcFromLevel(currentTotalBefore);
      const { toLevel, toPct } = calcToLevel(currentTotalBefore + finalTotal);
      await animateProgress(qs("#levelProgress"), fromPct, toPct, { ease: "easeOut" });

      // Update labels at top
      qs("#levelFrom").textContent = toLevel;
      qs("#levelTo").textContent = toLevel + 1;
      qs("#levelToLabel").style.opacity = 0.9;
    },
  };

  // ----- local to view -----
  function animateObservation({ total, detail, counterEl, detailsEl, badgeEl }, options = {}) {
    const entries = Object.entries(detail || []);
    detailsEl.innerHTML = "";
    const duration = 1800;
    const start = performance.now();
    const ease = getEaseFn(options.ease || "linear");
    const revealPortion = 0.7;
    const revealTimes = entries.map((_, i) => (i + 1) / (entries.length || 1) * (duration * revealPortion));
    let revealed = 0;

    return new Promise((resolve) => {
      function frame(ts) {
        const elapsed = ts - start;
        const t = Math.min(1, elapsed / duration);
        const val = Math.round(total * ease(t));
        counterEl.textContent = String(val);
        upgradeBadgeBy(val, badgeEl); // keeps common/rare/epic/legendary classes current

        while (revealed < revealTimes.length && elapsed >= revealTimes[revealed]) {
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
}
