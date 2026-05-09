import { db } from "./firebaseConfig.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { TEAM_INFO } from "./teamInfoConstants.js";

const seasonSelect = document.getElementById("seasonFilter");
const weekSelect = document.getElementById("weekFilter");
const typeSelect = document.getElementById("typeFilter");
const scheduleContainer = document.getElementById("gamesContainer");

// ---- LOAD SEASONS ----
async function loadSeasons() {
  const schedulesRef = ref(db, "config/schedules");
  const snapshot = await get(schedulesRef);

  console.log("loadSeasons() snapshot:", snapshot.exists(), snapshot.val());

  if (!snapshot.exists()) {
    scheduleContainer.innerHTML = `<p>No schedule data found (no seasons)</p>`;
    return;
  }

  const seasons = Object.keys(snapshot.val());
  console.log("Seasons found:", seasons);

  seasonSelect.innerHTML = `<option value="">Select Season</option>`;
  seasons.forEach((season) => {
    const opt = document.createElement("option");
    opt.value = season;
    opt.textContent = `Season ${season}`;
    seasonSelect.appendChild(opt);
  });
}

// ---- LOAD WEEKS ----
async function loadWeeks(seasonId, type) {
  if (!seasonId || !type) return;

  const path = `config/schedules/${seasonId}/${type}`;
  console.log("Loading weeks from:", path);

  const snapshot = await get(ref(db, path));
  console.log("Weeks snapshot:", snapshot.exists(), snapshot.val());

  if (!snapshot.exists()) {
    weekSelect.innerHTML = `<option value="">No Weeks Found</option>`;
    return;
  }

  const weeks = Object.keys(snapshot.val());
  weekSelect.innerHTML = `<option value="">Select Week</option>`;
  weeks.forEach((week) => {
    const opt = document.createElement("option");
    opt.value = week;
    opt.textContent = `Week ${week}`;
    weekSelect.appendChild(opt);
  });
}

// ---- LOAD GAMES ----
async function loadGames(seasonId, type, week) {
  if (!seasonId || !type || !week) return;

  const path = `config/schedules/${seasonId}/${type}/${week}`;
  console.log("Loading games from:", path);

  const snapshot = await get(ref(db, path));
  console.log("Games snapshot:", snapshot.exists(), snapshot.val());

  if (!snapshot.exists()) {
    scheduleContainer.innerHTML = `<p>No games found for week ${week}.</p>`;
    return;
  }

  const games = Object.values(snapshot.val());
  scheduleContainer.innerHTML = "";

  games.forEach((game) => {
    console.log("Game object:", game);

    const homeTeam = TEAM_INFO[game.homeTeamId];
    const awayTeam = TEAM_INFO[game.awayTeamId];

    const homeLogo = homeTeam ? `images/logos/${homeTeam.logoId}.png` : "images/default.png";
    const awayLogo = awayTeam ? `images/logos/${awayTeam.logoId}.png` : "images/default.png";

    const gameBox = document.createElement("div");
    gameBox.classList.add("game-box");
    gameBox.innerHTML = `
      <div class="game-row">
        <div class="team">
          <img src="${awayLogo}" alt="${awayTeam?.abbrName || "Away"}" class="team-logo">
          <span>${awayTeam?.abbrName || "???"}</span>
        </div>
        <div class="score">
          <span>${game.awayScore ?? "-"}</span>
          <span> @ </span>
          <span>${game.homeScore ?? "-"}</span>
        </div>
        <div class="team">
          <img src="${homeLogo}" alt="${homeTeam?.abbrName || "Home"}" class="team-logo">
          <span>${homeTeam?.abbrName || "???"}</span>
        </div>
      </div>
    `;
    scheduleContainer.appendChild(gameBox);
  });
}

// ---- EVENT LISTENERS ----
seasonSelect.addEventListener("change", async () => {
  const seasonId = seasonSelect.value;
  const type = typeSelect.value;
  weekSelect.innerHTML = "";
  scheduleContainer.innerHTML = "";
  if (seasonId && type) await loadWeeks(seasonId, type);
});

typeSelect.addEventListener("change", async () => {
  const seasonId = seasonSelect.value;
  const type = typeSelect.value;
  weekSelect.innerHTML = "";
  scheduleContainer.innerHTML = "";
  if (seasonId && type) await loadWeeks(seasonId, type);
});

weekSelect.addEventListener("change", async () => {
  const seasonId = seasonSelect.value;
  const type = typeSelect.value;
  const week = weekSelect.value;
  if (seasonId && type && week) await loadGames(seasonId, type, week);
});

// Initialize
loadSeasons();
