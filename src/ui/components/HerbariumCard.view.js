// src/ui/components/HerbariumCard.view.js

export function createHerbariumCardView({ name, discoveredAt, image_url = "" }) {
  const root = document.createElement("div");
  root.className = "herbarium-item";

  const when = formatDiscoveryDate(discoveredAt);

  root.innerHTML = `
    <div class="herbarium-card">
      <div class="herbarium-img">
        ${image_url
          ? `<img src="${image_url}" alt="${name}" loading="lazy">`
          : `<div class="wiki-skeleton"></div>`}
      </div>
      <div class="herbarium-info">
        <p class="herbarium-name"><strong>${name}</strong></p>
        <p class="herbarium-date">${when}</p>
      </div>
    </div>
  `;

  const imgWrap = root.querySelector(".herbarium-img");

  return {
    element: root,
    setImage(url) {
      if (!imgWrap) return;
      if (url) {
        imgWrap.innerHTML = `<img src="${url}" alt="${name}" loading="lazy">`;
      } else {
        imgWrap.innerHTML = `<div class="wiki-missing">No image</div>`;
      }
    },
  };
}

function formatDiscoveryDate(ts) {
  let d = null;
  if (ts?.toDate) d = ts.toDate();
  else if (typeof ts?.seconds === "number") d = new Date(ts.seconds * 1000);
  else if (ts instanceof Date) d = ts;
  else if (typeof ts === "string" || typeof ts === "number") {
    const tmp = new Date(ts);
    if (!isNaN(tmp.getTime())) d = tmp;
  }
  if (!d) return "—";

  return d.toLocaleString(undefined, {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}
