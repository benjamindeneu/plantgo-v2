import { doSignOut } from "../../auth/guard.js";

export function Header({ user, level=1, progress=0 }) {
  const root = document.createElement("header");
  root.className = "nav";
  root.innerHTML = `
    <div class="brandmark">🌿 PlantGo</div>
    <div style="display:flex;align-items:center;gap:12px">
      <span class="muted">${user?.displayName || user?.email || "User"}</span>
      <span class="level-badge">
        Lv. <strong id="levelNumber">${level}</strong>
        <span id="levelProgressContainer"><span id="levelProgressBar" style="width:${progress}%"></span></span>
      </span>
      <button id="signout" class="btn">Sign out</button>
    </div>
  `;
  root.querySelector("#signout").addEventListener("click", doSignOut);
  return root;
}
