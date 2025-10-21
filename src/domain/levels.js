// src/domain/levels.js
export function nextLevelInfo(points, thresholds) {
  const current = thresholds.filter(t => points >= t).slice(-1)[0] ?? 0;
  const next = thresholds.find(t => t > points) ?? current;
  const denom = Math.max(1, next - current);
  const progress = Math.min(1, Math.max(0, (points - current) / denom));
  return { current, next, progress };
}
