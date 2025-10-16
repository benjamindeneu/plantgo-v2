# PlantGo v2 scaffold

A modernized, modular front-end that **preserves your existing API endpoints**.

## Highlights
- **Clean file structure** under `src/` with small, testable modules.
- **API layer** (`src/api/`) wraps your existing endpoints:
  - `SPECIES_PROXY_URL`: `https://giving-winning-mastodon.ngrok-free.app/api/missions`
  - `IDENTIFY_PROXY_URL`: `https://giving-winning-mastodon.ngrok-free.app/api/identify`
  - `POINTS_PROXY_URL`: `https://giving-winning-mastodon.ngrok-free.app/api/points`
- **UI components** for header, identification flow, and missions.
- **Firebase auth** reused exactly from your config.

## Next steps
1. Drop this folder into your hosting environment (or `npm serve`/simple static server).
2. Port any remaining v1 logic (e.g., points awarding, badges) into new components.
3. Keep all API URLs the same – change them centrally in `src/api/config.js` only if you *must*.

## Dev tips
- Add more components under `src/ui/components/` (e.g., `Badges.js`, `LevelUp.js`).
- Keep each module focused and side-effect free where possible.
- Prefer dependency injection for functions that call the network, to simplify testing.
