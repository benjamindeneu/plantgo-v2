// signup.js
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

import { auth, db } from "./firebase-config.js";
import { doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

import { initI18n, t } from "./src/language/i18n.js";

// Init translations first (same as login)
await initI18n();

const form = document.getElementById("signupForm");
const messageEl = document.getElementById("signupMessage");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  messageEl.textContent = "";

  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (password !== confirmPassword) {
    messageEl.textContent = t("signup.error.passwordMismatch");
    return;
  }

  try {
    // Create a new user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Set the display name to the chosen username
    await updateProfile(user, { displayName: username });

    // Create a Firestore document for the new user
    await setDoc(doc(db, "users", user.uid), {
      name: username,
      email: email,
      total_points: 0
    });

    try {
      // Attempt to send the email verification
      await sendEmailVerification(user);

      // Inform the user and remove the signup form
      messageEl.textContent = t("signup.success.verificationSent");
      form.remove();
    } catch (emailError) {
      // If email sending fails, remove the created user and firestore doc
      await user.delete();
      await deleteDoc(doc(db, "users", user.uid));

      messageEl.textContent = t("signup.error.verificationFailed");
    }
  } catch (error) {
    // If you want this translated too, we can map Firebase error codes like you did in login
    messageEl.textContent = error?.message || "Signup failed.";
  }
});
