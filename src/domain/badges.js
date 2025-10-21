// src/domain/badges.js
export function evaluateNewBadges(user, observations) {
  const unlocked = [];
  const speciesSet = new Set(observations.map(o => o.speciesId));
  if (speciesSet.size >= 10) unlocked.push({ id: "collector-10", name: "Collector (10 species)" });
  if (observations.length >= 20) unlocked.push({ id: "field-20", name: "Field Enthusiast (20 obs)" });
  return unlocked;
}
