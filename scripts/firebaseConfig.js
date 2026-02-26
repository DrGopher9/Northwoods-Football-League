// scripts/firebaseConfig.js
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyD0GRsN_DKBPk4wN2AkkQcp2wPwmvnc6kk",
  authDomain: "northwoods-league.firebaseapp.com",
  projectId: "northwoods-league",
  storageBucket: "northwoods-league.appspot.com",
  messagingSenderId: "126666417138",
  appId: "1:126666417138:web:f51daf6de2cd65650a016b",
  databaseURL: "https://northwoods-league-default-rtdb.firebaseio.com"
};

// Avoid duplicate initialization
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export { app };                 // ✅ export app
export const auth = getAuth(app); // ✅ export auth
export const db = getDatabase(app);
