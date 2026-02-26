import { db } from "./firebaseConfig.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { TEAM_INFO } from "./teamInfoConstants.js";

// DOM Elements
const seasonSelect = document.getElementById("seasonFilter");
const typeSelect = document.getElementById("typeFilter");
const weekSelect = document.getElementById("weekFilter");
const teamSelect = document.getElementById("teamFilter");
const scheduleContainer = document.getElementById("gamesContainer");
const loader = document.getElementById("schedule-loader");

// State
let currentGames = [];

document.addEventListener("DOMContentLoaded", () => {
  populateTeamFilter();
  loadSeasons();
});

// ---- INITIALIZE FILTERS ----
function populateTeamFilter() {
  const sortedTeams = Object.values(TEAM_INFO).sort((a, b) => 
    a.city.localeCompare(b.city)
  );

  sortedTeams.forEach(team => {
    const opt = document.createElement("option");
    opt.value = team.teamId;
    opt.textContent = `${team.city} ${team.name}`;
    teamSelect.appendChild(opt);
  });
}

// ---- LOAD SEASONS ----
async function loadSeasons() {
  try {
    const schedulesRef = ref(db, "config/schedules");
    const snapshot = await get(schedulesRef);

    if (!snapshot.exists()) {
      scheduleContainer.innerHTML = `<div class="empty-state">No schedule data found.</div>`;
      loader.style.display = "none";
      return;
    }

    const seasons = Object.keys(snapshot.val()).sort((a, b) => b - a); 
    
    seasonSelect.innerHTML = "";
    seasons.forEach((season) => {
      const opt = document.createElement("option");
      opt.value = season;
      opt.textContent = `Season ${season}`;
      seasonSelect.appendChild(opt);
    });

    seasonSelect.disabled = false;
    await loadWeeks(seasonSelect.value, typeSelect.value);

  } catch (error) {
    console.error("Error loading seasons:", error);
    loader.textContent = "Error loading schedule data.";
  }
}

// ---- LOAD WEEKS ----
async function loadWeeks(seasonId, type) {
  if (!seasonId || !type) return;

  try {
    const path = `config/schedules/${seasonId}/${type}`;
    const snapshot = await get(ref(db, path));

    weekSelect.innerHTML = "";

    if (!snapshot.exists()) {
      weekSelect.innerHTML = `<option value="">No Weeks</option>`;
      weekSelect.disabled = true;
      scheduleContainer.innerHTML = `<div class="empty-state">No games found for this season type.</div>`;
      loader.style.display = "none";
      return;
    }

    const weeks = Object.keys(snapshot.val()).sort((a, b) => Number(a) - Number(b));
    
    const allOpt = document.createElement("option");
    allOpt.value = "all";
    allOpt.textContent = "All Weeks";
    weekSelect.appendChild(allOpt);

    const seenLabels = new Set(); // Prevent duplicate dropdown options

    weeks.forEach((week) => {
      let label = `Week ${week}`;
      if (seenLabels.has(label)) return;
      seenLabels.add(label);

      const opt = document.createElement("option");
      opt.value = week;
      opt.textContent = label;
      weekSelect.appendChild(opt);
    });

    weekSelect.disabled = false;
    weekSelect.value = "all";
    await loadGames(seasonId, type, "all");

  } catch (error) {
    console.error("Error loading weeks:", error);
  }
}

// ---- LOAD GAMES ----
async function loadGames(seasonId, type, week) {
  if (!seasonId || !type || !week) return;

  loader.style.display = "block";
  scheduleContainer.style.display = "none";

  try {
    currentGames = [];

    if (week === "all") {
      const path = `config/schedules/${seasonId}/${type}`;
      const snapshot = await get(ref(db, path));
      
      if (snapshot.exists()) {
        const allWeeksData = snapshot.val();
        Object.entries(allWeeksData).forEach(([weekNum, gamesObj]) => {
          Object.values(gamesObj).forEach(game => {
            currentGames.push({ ...game, displayWeek: Number(weekNum) });
          });
        });
        currentGames.sort((a, b) => a.displayWeek - b.displayWeek);
      }
    } else {
      const path = `config/schedules/${seasonId}/${type}/${week}`;
      const snapshot = await get(ref(db, path));
      
      if (snapshot.exists()) {
        Object.values(snapshot.val()).forEach(game => {
          currentGames.push({ ...game, displayWeek: Number(week) });
        });
      }
    }

    renderGames();

  } catch (error) {
    console.error("Error loading games:", error);
    scheduleContainer.innerHTML = `<div class="empty-state">Error loading games.</div>`;
  } finally {
    loader.style.display = "none";
    scheduleContainer.style.display = "grid";
  }
}

// ---- RENDER GAMES ----
function renderGames() {
  scheduleContainer.innerHTML = "";
  const selectedTeamId = teamSelect.value;

  // Aggressive Deduplication filter
  const uniqueGames = [];
  const seen = new Set();
  
  currentGames.forEach(game => {
    if (!game || !game.homeTeamId || !game.awayTeamId) return;
    const key = `${game.homeTeamId}-${game.awayTeamId}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueGames.push(game);
    }
  });

  // Filter games if a specific team is selected
  const filteredGames = uniqueGames.filter(game => {
    if (!selectedTeamId) return true;
    return String(game.homeTeamId) === selectedTeamId || String(game.awayTeamId) === selectedTeamId;
  });

  if (filteredGames.length === 0) {
    scheduleContainer.innerHTML = `<div class="empty-state">No games match the selected filters.</div>`;
    return;
  }

  filteredGames.forEach((game) => {
    const homeTeam = Object.values(TEAM_INFO).find(t => String(t.teamId) === String(game.homeTeamId));
    const awayTeam = Object.values(TEAM_INFO).find(t => String(t.teamId) === String(game.awayTeamId));

    const homeLogo = homeTeam ? `images/logos/${homeTeam.logoId}.png` : "images/logos/default.png";
    const awayLogo = awayTeam ? `images/logos/${awayTeam.logoId}.png` : "images/logos/default.png";
    const homeAbbr = homeTeam?.abbr || "UNK";
    const awayAbbr = awayTeam?.abbr || "UNK";

    const awayScore = game.awayScore ?? "-";
    const homeScore = game.homeScore ?? "-";
    
    const awayClass = (game.awayScore > game.homeScore) ? "winner-score" : "";
    const homeClass = (game.homeScore > game.awayScore) ? "winner-score" : "";
    
    let statusText = "Final";
    if (game.awayScore === null || game.awayScore === "" || game.homeScore === null || game.homeScore === "") {
        statusText = "TBD";
    }

    const gameCard = document.createElement("a");
    gameCard.classList.add("game-card");
    gameCard.href = game.scheduleId ? `game.html?scheduleId=${game.scheduleId}` : "#";

    gameCard.innerHTML = `
      <div class="game-team">
        <img src="${awayLogo}" alt="${awayAbbr}">
        <span class="game-team-name">${awayAbbr}</span>
      </div>
      
      <div class="game-center">
        <span style="font-size: 0.85rem; color: var(--accent-blue); font-weight: bold; text-transform: uppercase; margin-bottom: 0.3rem;">Week ${game.displayWeek}</span>
        <div class="game-score-row">
          <span class="${awayClass}">${awayScore}</span>
          <span class="game-vs">vs</span>
          <span class="${homeClass}">${homeScore}</span>
        </div>
        <span class="game-status">${statusText}</span>
      </div>

      <div class="game-team">
        <img src="${homeLogo}" alt="${homeAbbr}">
        <span class="game-team-name">${homeAbbr}</span>
      </div>
    `;
    
    scheduleContainer.appendChild(gameCard);
  });
}

// ---- EVENT LISTENERS ----
seasonSelect.addEventListener("change", () => loadWeeks(seasonSelect.value, typeSelect.value));
typeSelect.addEventListener("change", () => loadWeeks(seasonSelect.value, typeSelect.value));
weekSelect.addEventListener("change", () => loadGames(seasonSelect.value, typeSelect.value, weekSelect.value));
teamSelect.addEventListener("change", renderGames);
