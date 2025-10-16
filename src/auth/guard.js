
import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

export function requireAuth() {
  return new Promise((resolve) => {
    let resolved = false;
    onAuthStateChanged(auth, (user) => {
      console.log("[auth] state:", user ? "logged-in" : "logged-out");
      if (user) {
        if (!resolved) { resolved = true; }
        resolve(user);
      } else {
        const target = new URL("./login.html", location.href).toString();
        if (location.href != target) {
          console.log("[auth] redirect -> login.html");
          location.replace("./login.html");
        }
      }
    }, (err) => {
      console.error("[auth] onAuthStateChanged error:", err);
      location.replace("./login.html");
    });
  });
}

export function redirectIfAuthed() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      console.log("[auth] redirectIfAuthed:", !!user);
      const path = location.pathname.toLowerCase();
      const isAuthPage = path.includes("login.html") || path.includes("signup.html");
      if (user && isAuthPage) {
        console.log("[auth] redirect -> index.html");
        location.replace("./index.html");
      }
      resolve(user);
    });
  });
}
