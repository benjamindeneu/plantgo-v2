export function HerbariumCardView({ speciesName, photoUrl, points }) {
  return `
    <article class="card herbarium">
      <img class="thumb" src="${photoUrl||""}" alt="${speciesName||"Specimen"}">
      <div class="info">
        <h3 class="title">${speciesName||"Unknown species"}</h3>
        <div class="meta">
          <span class="pill">+${points||0} pts</span>
        </div>
      </div>
    </article>
  `;
}
