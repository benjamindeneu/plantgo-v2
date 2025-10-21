# PlantGo — Refactored (Views vs Logic)

This refactor separates visuals from functionality.

- `src/ui/**` — pure views (no side effects)
- `src/controllers/**` — UI logic and wiring
- `src/services/**` — Firebase + side effects
- `src/domain/**` — pure logic
- `src/state/**` — simple state store
- `assets/styles.css` — styles

## Firebase config
Place your config in `src/services/firebase-config.js`. Both of these are supported:
```js
// Option A (named)
export const firebaseConfig = { /* ... */ };

// Option B (default)
export default { /* ... */ };
```
Controllers/services import using a resilient pattern that works for both.

## Run
Open `index.html` with a static server.
