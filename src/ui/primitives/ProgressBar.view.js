export function ProgressBar({ value = 0 }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return `
    <div class="progress-rail" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
      <div class="progress-bar" style="width:${pct}%"></div>
    </div>
  `;
}
