// src/ui/components/QuestsChip.view.js
import { t } from "../../language/i18n.js";
import { QUEST_BONUS } from "../../data/dailyQuests.js";

const QUEST_META = {
  daily_observations: { icon: "🌿", labelKey: "quests.obs.label" },
  inventory:          { icon: "📍", labelKey: "quests.inv.label" },
  mission:            { icon: "🎯", labelKey: "quests.mis.label" },
};

/**
 * The daily quests, as a counter in the header that opens a list.
 *
 * The old home page gave them a full card that rotated through one quest at a
 * time on a timer. The map has no room for that and the rotation meant two
 * thirds of your quests were always off screen; here the whole set is one tap
 * away and the header carries only the score.
 */
export function createQuestsChipView() {
  const root = document.createElement("div");
  root.className = "mp-quests";
  root.innerHTML = `
    <button class="mp-quests__btn" type="button" aria-haspopup="true" aria-expanded="false">
      <span class="mp-quests__icon" aria-hidden="true">🏆</span>
      <span class="mp-quests__count">0/0</span>
    </button>
    <div class="mp-quests__panel" role="dialog" hidden>
      <div class="mp-quests__head">
        <h3 class="mp-quests__title"></h3>
        <span class="mp-quests__reward"></span>
      </div>
      <ul class="mp-quests__list"></ul>
    </div>
  `;

  const btn = root.querySelector(".mp-quests__btn");
  const countEl = root.querySelector(".mp-quests__count");
  const panel = root.querySelector(".mp-quests__panel");
  const titleEl = root.querySelector(".mp-quests__title");
  const rewardEl = root.querySelector(".mp-quests__reward");
  const listEl = root.querySelector(".mp-quests__list");

  let quests = [];

  function toggle(force) {
    const open = force !== undefined ? force : panel.hidden;
    panel.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
  }

  btn.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });
  // Same dismissal as the header menu next to it: a tap anywhere else closes.
  document.addEventListener("click", (e) => { if (!root.contains(e.target)) toggle(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggle(false); });

  function render() {
    const done = quests.filter((q) => q.completed).length;
    countEl.textContent = `${done}/${quests.length || 0}`;
    root.classList.toggle("is-complete", quests.length > 0 && done === quests.length);

    titleEl.textContent = t("quests.title");
    rewardEl.textContent = `🏆 +${QUEST_BONUS}`;

    listEl.replaceChildren();
    for (const q of quests) {
      const meta = QUEST_META[q.id] || { icon: "❓", labelKey: q.id };
      const pct = q.goal > 0 ? Math.min(100, Math.round((q.progress / q.goal) * 100)) : 0;

      const li = document.createElement("li");
      li.className = "mp-quest" + (q.completed ? " is-done" : "");
      li.innerHTML = `
        <span class="mp-quest__icon" aria-hidden="true"></span>
        <span class="mp-quest__body">
          <span class="mp-quest__label"></span>
          <span class="mp-quest__rail"><span class="mp-quest__fill"></span></span>
        </span>
        <span class="mp-quest__meta"></span>
      `;
      li.querySelector(".mp-quest__icon").textContent = meta.icon;
      li.querySelector(".mp-quest__label").textContent = t(meta.labelKey);
      li.querySelector(".mp-quest__fill").style.width = `${pct}%`;
      li.querySelector(".mp-quest__meta").textContent = q.completed
        ? "✓"
        : `${q.progress}/${q.goal}`;
      listEl.appendChild(li);
    }
  }

  render();
  document.addEventListener("i18n:changed", render);

  return {
    element: root,
    updateQuests(next = []) { quests = next; render(); },
    close: () => toggle(false),
  };
}
