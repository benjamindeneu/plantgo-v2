import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import * as _cfg from "./firebase-config.js";
const firebaseConfig = _cfg.firebaseConfig ?? _cfg.default ?? _cfg;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export function watchAuth(callback) { return onAuthStateChanged(auth, callback); }
export async function logout() { await signOut(auth); }
export { auth };
