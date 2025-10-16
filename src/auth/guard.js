import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

export function requireAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      const path = location.pathname.toLowerCase();
      const isAuthPage = path.endsWith("/login.html") || path.endsWith("/signup.html");
      if (!user && !isAuthPage) {
        location.replace("./login.html");
      } else if (user) {
        resolve(user);
      }
    }, (err) => {
      console.error("Auth state error:", err);
      // In case of error, push to login to avoid whitescreen
      location.replace("./login.html");
    });
  });
}

export function redirectIfAuthed() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      const path = location.pathname.toLowerCase();
      const isAuthPage = path.endsWith("/login.html") || path.endsWith("/signup.html");
      if (user && isAuthPage) {
        location.replace("./index.html");
      }
      resolve(user);
    });
  });
}
