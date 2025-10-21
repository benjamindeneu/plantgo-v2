// View for missions list
export function MissionsPanelView({ missions }) {
  return `
    <section class="missions panel">
      <header class="panel-head">
        <h2 class="h2">Missions</h2>
        <p class="muted">Complete missions to earn extra points and badges.</p>
      </header>

      <ul class="list missions">
        ${(missions||[]).map(m => `
          <li class="mission ${m.completed ? "done" : ""}" data-id="${m.id}">
            <div class="mission-main">
              <h4 class="title">${m.title}</h4>
              <p class="muted">${m.desc||""}</p>
              <div class="pill">${m.points} pts</div>
            </div>
            <div class="mission-progress">
              <div class="progress-rail">
                <div class="progress-bar" style="width:${Math.min(100, Math.round((m.progress||0)*100))}%"></div>
              </div>
              <div class="muted small">${Math.round((m.progress||0)*100)}%</div>
              <button class="btn ${m.completed ? "ghost" : "primary"}" data-claim="${m.id}" ${m.completed ? "disabled" : ""}>
                ${m.completed ? "Completed" : "Claim"}
              </button>
            </div>
          </li>
        `).join("")}
      </ul>
    </section>
  `;
}
