// scripts/admin_gate.js
import { app, auth, db } from "./firebaseConfig.js";
import {
  onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, getIdToken
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Page elements
const htmlEl = document.documentElement;
const gateMsg = document.getElementById("adminGateMsg");
const btnSignIn = document.getElementById("gateSignIn");
const btnSignOut = document.getElementById("gateSignOut");
const btnBack = document.getElementById("gateBack");

// Start in "checking" state: show gate only
htmlEl.classList.add("admin-checking");

function setState(state, msg) {
  htmlEl.classList.remove("admin-checking", "need-signin", "not-admin");
  if (state) htmlEl.classList.add(state);
  if (gateMsg && msg) gateMsg.textContent = msg;
}

// Sign in/out handlers
btnSignIn?.addEventListener("click", async () => {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (e) {
    setState("need-signin", "Sign-in failed. Please try again.");
  }
});

btnSignOut?.addEventListener("click", async () => {
  await signOut(auth);
});

// Helper: check admin flag in RTDB at config/admins/{uid}: true
async function isAdmin(uid) {
  if (!uid) return false;
  const snap = await get(ref(db, `config/admins/${uid}`));
  return snap.exists() && snap.val() === true;
}

// Attach ID token to all fetches from this page (so server can verify)
async function authFetch(input, init = {}) {
  const user = auth.currentUser;
  const token = user ? await getIdToken(user, /*forceRefresh*/ false) : null;
  const headers = new Headers(init.headers || {});
  if (token) headers.set("x-fb-id-token", token);
  return fetch(input, { ...init, headers });
}
window.authFetch = authFetch; // expose globally for other admin scripts

// Main gate
onAuthStateChanged(auth, async (user) => {
  try {
    if (!user) {
      btnSignIn?.style?.setProperty("display", "");
      btnSignOut?.style?.setProperty("display", "none");
      setState("need-signin", "Please sign in to access the Admin Hub.");
      return;
    }
    btnSignIn?.style?.setProperty("display", "none");
    btnSignOut?.style?.setProperty("display", "");

    const ok = await isAdmin(user.uid);
    if (!ok) {
      setState("not-admin", "You’re signed in, but you do not have admin access.");
      // Optional redirect after a short delay:
      setTimeout(() => { location.href = "/"; }, 1200);
      return;
    }

    // Good to go: reveal page
    setState("", "");
  } catch (e) {
    setState("need-signin", "Auth check failed. Please sign in again.");
  }
});
