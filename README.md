# PlantGo v2 scaffold (auth-compatible)

- Two endpoints only (missions + identify) with a thin API wrapper in `src/api`.
- Auth restored to your original working pattern:
  - Root-level `firebase-config.js`
  - `login.js` and `signup.js` unchanged (uses the same form IDs and flows)
- Modern modular UI in `src/ui/components` (no framework lock-in).

## Run
Serve the folder with any static server (e.g., `npx serve`) and open `login.html` / `signup.html` / `index.html`.
