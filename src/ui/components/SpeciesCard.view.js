// src/ui/components/SpeciesCard.view.js
// Pure card for a species row/card. Useful in lists and results.
export function SpeciesCardView({ id, name, latinName, photoUrl, rarity, points }) {
  return `
    <article class="card species" data-species-id="${id}">
      <img class="thumb" src="${photoUrl||""}" alt="${name||latinName||"Species"}">
      <div class="info">
        <h3 class="title">${name||latinName||"Unknown species"}</h3>
        ${latinName ? `<p class="muted"><em>${latinName}</em></p>` : ""}
        <div class="meta">
          ${rarity ? `<span class="pill">${rarity}</span>` : ""}
          ${typeof points === "number" ? `<span class="pill">+${points} pts</span>` : ""}
        </div>
        <div class="actions">
          <button class="btn outline" data-action="details" data-id="${id}">Details</button>
        </div>
      </div>
    </article>
  `;
}
