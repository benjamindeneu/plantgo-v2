# PlantGo — Refactored (Views vs Logic)

This refactor separates **visuals** from **functionality**:

- `src/ui/**` — *pure views* (no Firebase or side effects)
- `src/controllers/**` — *event glue* (listen to state and user events)
- `src/services/**` — *Firebase & side-effects*
- `src/domain/**` — *pure logic* (points, levels, badges)
- `src/state/**` — lightweight store
- `assets/styles.css` — your existing stylesheet

## Run
Open `index.html` with a static server (or Live Server).

Hook your existing Identify/Missions logic by adding controllers + services without touching views.
