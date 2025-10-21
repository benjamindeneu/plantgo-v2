export function HeaderView({ user }) {
  return `
    <nav class="nav">
      <div class="nav-left">
        <a class="brand" href="/">PlantGo</a>
      </div>
      <div class="nav-right">
        ${user ? `
          <div class="user-chip">
            <span class="avatar">${(user.displayName||"U")[0].toUpperCase()}</span>
            <span class="name">${user.displayName||"User"}</span>
            <button class="btn outline" data-logout>Sign out</button>
          </div>` : `
          <a class="btn primary" href="./login.html">Sign in</a>`
        }
      </div>
    </nav>
  `;
}
