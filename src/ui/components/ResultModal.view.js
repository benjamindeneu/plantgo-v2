import { ProgressBar } from "../primitives/ProgressBar.view.js";

export function ResultModalView({ open, points, level, badges }) {
  const dialogAttrs = open ? " open" : "";
  return `
    <dialog id="resultModal" class="modal"${dialogAttrs} aria-labelledby="rm-title">
      <div class="modal-content result">
        <button data-close class="close" aria-label="Close">×</button>
        <div class="result-head">
          <div class="points-badge epic-points">
            <span class="label">Observation points</span>
            <span class="value">${points}</span>
          </div>
        </div>
        <div class="level-wrap at-top">
          <div class="level-line">
            <span>Level</span>
            <span>${level.current} → ${level.next}</span>
          </div>
          ${ProgressBar({ value: level.progress })}
        </div>
        <div class="badges big">
          ${(badges||[]).map(b => `
            <span class="badge big in" data-badge-id="${b.id}">
              <span class="icon">🏅</span>
              <span class="txt">${b.name}</span>
            </span>
          `).join("")}
        </div>
        <div class="result-actions">
          <button class="primary" data-cta="continue">Continue</button>
        </div>
      </div>
    </dialog>
  `;
}
