// src/ui/components/LocationGate.js
import { t } from "../../language/i18n.js";
import { getCurrentPosition, watchLocationPermission } from "../../data/geo.service.js";

/**
 * A blocking overlay for when location permission is denied.
 *
 * Every screen that matters needs a fix — the map centres on it, missions are
 * chosen by it — so this asks for the permission on load and stands in the way
 * until it is granted. Lives here rather than in a page bootstrap because both
 * the map (front page) and the old home page mount it.
 *
 * @returns {() => void} teardown
 */
export function LocationGate() {
  const overlay = document.createElement("div");
  overlay.className = "location-gate";
  overlay.setAttribute("aria-live", "assertive");
  overlay.setAttribute("role", "alert");
  overlay.innerHTML = `
    <div class="location-gate__card">
      <div class="location-gate__icon">📍</div>
      <h2 class="location-gate__title"></h2>
      <p class="location-gate__message"></p>
    </div>
  `;
  document.body.appendChild(overlay);

  const titleEl = overlay.querySelector(".location-gate__title");
  const msgEl = overlay.querySelector(".location-gate__message");

  const applyTranslations = () => {
    titleEl.textContent = t("location.gate.title");
    msgEl.textContent = t("location.gate.message");
  };
  applyTranslations();
  document.addEventListener("i18n:changed", applyTranslations);

  const show = () => overlay.classList.add("location-gate--visible");
  const hide = () => overlay.classList.remove("location-gate--visible");

  const stopWatch = watchLocationPermission({ onGranted: hide, onDenied: show });

  // Trigger the browser permission prompt immediately; also catch denied state
  // for browsers that don't support the Permissions API.
  getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 })
    .then(hide)
    .catch((err) => { if (err.code === 1) show(); });

  return () => {
    stopWatch();
    document.removeEventListener("i18n:changed", applyTranslations);
    overlay.remove();
  };
}
