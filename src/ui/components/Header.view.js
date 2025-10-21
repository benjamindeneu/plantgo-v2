// src/ui/components/Header.view.js

/**
 * Pure view for the header.
 * - Renders the DOM
 * - Manages visual toggle of the menu
 * - Exposes event hooks for controller
 */
export function createHeaderView({
  user,
  level = 1,
  menuVariant = "main", // "main" | "herbarium"
} = {}) {
  const isHerbarium = menuVariant === "herbarium";

  const root = document.createElement("header");
  root.className = "nav";
  root.innerHTML = `
    <div class="brandmark">🌿 PlantGo</div>
    <div class="user-area">
      <button id="userBtn" class="user-btn" aria-haspopup="menu" aria-expanded="false" type="button">
        <span class="user-name">${user?.displayName ?? "User"}</span>
        <span class="level-badge">Lv. <span id="levelNumber">${level}</span></span>
      </button>
      <div id="userMenu" class="menu" role="menu" style="display:none">
        ${
          isHerbarium
            ? `<button class="menu-item" role="menuitem" id="menuHome">🏠 Main</button>`
            : `<button class="menu-item" role="menuitem" id="menuHerbarium">📗 Herbarium</button>`
        }
        <button class="menu-item danger" role="menuitem" id="menuLogout">🚪 Log out</button>
      </div>
    </div>
  `;

  const btn = root.querySelector("#userBtn");
  const menu = root.querySelector("#userMenu");
  const levelEl = root.querySelector("#levelNumber");
  const nameEl = root.querySelector(".user-name");
  const primaryNavBtn = root.querySelector(isHerbarium ? "#menuHome" : "#menuHerbarium");
  const logoutBtn = root.querySelector("#menuLogout");

  // callbacks set by controller
  let onMenuToggle = null;
  let onPrimaryNav = null;
  let onLogout = null;

  function toggleMenu(force) {
    const willOpen = force !== undefined ? force : menu.style.display === "none";
    menu.style.display = willOpen ? "block" : "none";
    btn.setAttribute("aria-expanded", String(willOpen));
    if (onMenuToggle) onMenuToggle(willOpen);
  }

  // local UI wiring (no business logic)
  btn.addEventListener("click", () => toggleMenu());
  document.addEventListener("click", (e) => {
    if (!root.contains(e.target)) toggleMenu(false);
  });

  primaryNavBtn.addEventListener("click", () => {
    toggleMenu(false);
    if (onPrimaryNav) onPrimaryNav();
  });

  logoutBtn.addEventListener("click", () => {
    toggleMenu(false);
    if (onLogout) onLogout();
  });

  return {
    element: root,
    // view API for controller
    setUser(u) {
      nameEl.textContent = u?.displayName ?? "User";
    },
    setLevel(lvl) {
      levelEl.textContent = String(lvl ?? 1);
    },
    setOnMenuToggle(cb) { onMenuToggle = cb; },
    setOnPrimaryNav(cb) { onPrimaryNav = cb; },
    setOnLogout(cb) { onLogout = cb; },
  };
}
