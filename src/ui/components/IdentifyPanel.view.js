// Pure presentational component for the identify flow
export function IdentifyPanelView({ isLoading, photoPreview, suggestions }) {
  return `
    <section class="identify panel">
      <header class="panel-head">
        <h2 class="h2">Identify a plant</h2>
        <p class="muted">Upload a photo to get species suggestions.</p>
      </header>

      <div class="uploader">
        <label class="btn outline">
          <input type="file" accept="image/*" hidden data-file>
          <span>Choose photo</span>
        </label>
        ${photoPreview ? `<img class="preview" src="${photoPreview}" alt="Preview">` : ""}
        ${isLoading ? `<div class="spinner" aria-live="polite">Analyzing…</div>` : ""}
      </div>

      <div class="suggestions">
        <h3 class="h3">Suggestions</h3>
        <div class="grid cards">
          ${(suggestions||[]).map(s => `
            <article class="card species" data-species-id="${s.id}">
              <img class="thumb" src="${s.photo||""}" alt="${s.name} thumbnail">
              <div class="info">
                <h4 class="title">${s.name}</h4>
                <p class="muted">${s.confidence ? Math.round(s.confidence*100) : "—"}% match</p>
                <div class="actions">
                  <button class="btn primary" data-choose="${s.id}">Choose</button>
                </div>
              </div>
            </article>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}
