
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore, collection, getDocs, updateDoc, deleteDoc,
  doc, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyD0GRsN_DKBPk4wN2AkkQcp2wPwmvnc6kk",
  authDomain: "northwoods-league.firebaseapp.com",
  projectId: "northwoods-league",
  storageBucket: "northwoods-league.appspot.com",
  messagingSenderId: "126666417138",
  appId: "1:126666417138:web:f51daf6de2cd65650a016b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const gameForm = document.getElementById("gameForm");
const newsForm = document.getElementById("newsForm");
const newsList = document.getElementById("newsList");
const gameList = document.getElementById("gameList");
const filterWeek = document.getElementById("filterWeek");

const teams = ["ARI","ATL","BAL","BUF","CAR","CHI","CIN","CLE","DAL","DEN","DET","GB","HOU","IND","JAX","KC","LAC","LAR","LV","MIA","MIN","NE","NO","NYG","NYJ","PHI","PIT","SF","SEA","TB","TEN","WAS"];

const homeSelect = document.getElementById("homeTeam");
const awaySelect = document.getElementById("awayTeam");
teams.forEach(team => {
  const option1 = new Option(team, team);
  const option2 = new Option(team, team);
  homeSelect.appendChild(option1);
  awaySelect.appendChild(option2);
});

if (gameForm) {
  gameForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const week = document.getElementById("week").value;
    const homeTeam = homeSelect.value;
    const awayTeam = awaySelect.value;
    const homeScore = parseInt(document.getElementById("homeScore").value);
    const awayScore = parseInt(document.getElementById("awayScore").value);
    const summary = document.getElementById("summary").value.trim();
    const topPlayersRaw = document.getElementById("topPlayers").value.trim();
    const topPlayers = topPlayersRaw.split('\n').map(line => {
      const [name, stats] = line.split(' - ');
      return { name: name?.trim(), stats: stats?.trim() };
    }).filter(p => p.name && p.stats);

    const gameId = `${week}-${awayTeam}-${homeTeam}`;

    try {
      await setDoc(doc(db, "games", gameId), {
        week,
        homeTeam,
        awayTeam,
        homeScore,
        awayScore,
        summary,
        topPlayers,
        timestamp: serverTimestamp()
      });
      alert("✅ Game added!");
      gameForm.reset();
      loadGames();
    } catch (err) {
      console.error("Error adding game:", err);
      alert("❌ Failed to add game");
    }
  });
}

if (newsForm) {
  newsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const headline = document.getElementById("headline").value;
    const author = document.getElementById("author").value;

    try {
      await setDoc(doc(db, "news", `${Date.now()}`), {
        headline,
        author,
        timestamp: serverTimestamp()
      });
      alert("✅ News added!");
      newsForm.reset();
      loadNews();
    } catch (err) {
      console.error("Error adding news:", err);
      alert("❌ Failed to add news");
    }
  });
}

async function loadNews() {
  const snap = await getDocs(collection(db, "news"));
  newsList.innerHTML = "";
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${data.headline}</strong><br/>
      <small>by ${data.author || "Unknown"} - ${data.timestamp?.toDate().toLocaleString() || ""}</small>
      <div class="actions">
        <button onclick="deleteNews('${docSnap.id}')">Delete</button>
      </div>
    `;
    newsList.appendChild(li);
  });
}

window.deleteNews = async function(id) {
  await deleteDoc(doc(db, "news", id));
  loadNews();
};

async function loadGames() {
  const snap = await getDocs(collection(db, "games"));
  const weekSet = new Set();
  gameList.innerHTML = "";
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>Week ${data.week}: ${data.awayTeam} ${data.awayScore} @ ${data.homeTeam} ${data.homeScore}</strong><br/>
      <small>${data.summary || "No summary"}</small>
      <div class="actions">
        <button onclick="deleteGame('${docSnap.id}')">Delete</button>
      </div>
    `;
    gameList.appendChild(li);
    weekSet.add(data.week);
  });
  filterWeek.innerHTML = `<option value="all">All Weeks</option>`;
  [...weekSet].sort((a, b) => a - b).forEach(w => {
    filterWeek.innerHTML += `<option value="${w}">Week ${w}</option>`;
  });
}

window.deleteGame = async function(id) {
  await deleteDoc(doc(db, "games", id));
  loadGames();
};

window.exportToCSV = function() {
  const rows = Array.from(gameList.querySelectorAll("li")).map(li => li.innerText);
  const csv = rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "games.csv";
  link.click();
};

filterWeek.addEventListener("change", async () => {
  const week = filterWeek.value;
  const snap = await getDocs(collection(db, "games"));
  gameList.innerHTML = "";
  snap.forEach(docSnap => {
    const data = docSnap.data();
    if (week === "all" || data.week.toString() === week) {
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>Week ${data.week}: ${data.awayTeam} ${data.awayScore} @ ${data.homeTeam} ${data.homeScore}</strong><br/>
        <small>${data.summary || "No summary"}</small>
        <div class="actions">
          <button onclick="deleteGame('${docSnap.id}')">Delete</button>
        </div>
      `;
      gameList.appendChild(li);
    }
  });
});

loadGames();
loadNews();
