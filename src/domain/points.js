// Pure logic for observation points
export function computeObservationPoints(observation) {
  const base = 10;
  const rarityBonus = observation?.rarity === "rare" ? 25 : observation?.rarity === "uncommon" ? 10 : 0;
  const qualityBonus = observation?.photos?.length ? 5 : 0;
  return base + rarityBonus + qualityBonus;
}
