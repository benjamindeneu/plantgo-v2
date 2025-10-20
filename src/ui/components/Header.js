// src/ui/components/Header.js
export function Header({
  user,
  level = 1,
  progress = 0,
  menuVariant = "main", // "main" | "herbarium"
  onMenu,
  onLogout,
  onHerbarium,   // used in "main" variant
  onBackHome     // used in "herbarium" variant
}) {
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

  function toggleMenu(force) {
    const willOpen = force !== undefined ? force : menu.style.display === "none";
    menu.style.display = willOpen ? "block" : "none";
    btn.setAttribute("aria-expanded", String(willOpen));
  }

  btn.addEventListener("click", () => {
    toggleMenu();
    (onMenu || (() => {}))();
  });

  document.addEventListener("click", (e) => {
    if (!root.contains(e.target)) toggleMenu(false);
  });

  root.querySelector("#menuLogout").addEventListener("click", () => {
    toggleMenu(false);
    (onLogout || (() => {}))();
  });

  if (isHerbarium) {
    root.querySelector("#menuHome").addEventListener("click", () => {
      toggleMenu(false);
      (onBackHome || (() => {}))();
    });
  } else {
    root.querySelector("#menuHerbarium").addEventListener("click", () => {
      toggleMenu(false);
      (onHerbarium || (() => {}))();
    });
  }

  // Public helpers
  root.setUser = (u) => {
    root.querySelector(".user-name").textContent = u?.displayName ?? "User";
  };
  root.setLevel = (lvl) => {
    levelEl.textContent = String(lvl ?? 1);
  };

  return root;
}
