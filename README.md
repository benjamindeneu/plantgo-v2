# PlantGo v2 (auth-solid)

- Firebase **v11 modular** only (matches your firebase-config.js)
- Auth guard blocks app routes unless signed in
- Only two backend endpoints used:
  - /api/missions
  - /api/identify
- Header shows display name/email + sign out

## Dev
Serve over HTTP (required by ES modules & Firebase):
```bash
python -m http.server 5500
# open http://localhost:5500/login.html
```

Ensure Firebase Console → Authentication → Settings → **Authorized domains** includes `localhost`.
