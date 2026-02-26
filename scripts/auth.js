// scripts/auth.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyD0GRsN_DKBPk4wN2AkkQcp2wPwmvnc6kk",
  authDomain: "northwoods-league.firebaseapp.com",
  projectId: "northwoods-league",
  storageBucket: "northwoods-league.appspot.com",
  messagingSenderId: "126666417138",
  appId: "1:126666417138:web:f51daf6de2cd65650a016b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const logoutButton = document.getElementById("logoutButton");
const dashboard = document.getElementById("dashboard");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    alert("Login failed: " + error.message);
  }
});

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Signup successful!");
    signupForm.reset();
  } catch (error) {
    alert("Signup failed: " + error.message);
  }
});

logoutButton.addEventListener("click", () => {
  signOut(auth).then(() => {
    loginForm.style.display = "block";
    signupForm.style.display = "block";
    dashboard.style.display = "none";
    logoutButton.style.display = "none";
  });
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginForm.style.display = "none";
    signupForm.style.display = "none";
    dashboard.style.display = "block";
    logoutButton.style.display = "block";
  } else {
    loginForm.style.display = "block";
    signupForm.style.display = "block";
    dashboard.style.display = "none";
    logoutButton.style.display = "none";
  }
});
