
import { db } from "./firebaseConfig.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

function getTeamIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("teamId");
}

function formatMillions(value) {
  return (value / 1000000).toFixed(2) + "M";
}

function formatThousands(value) {
  return (value / 1000).toFixed(2) + "K";
}

function decimalToHexColor(decimal) {
  return "#" + (decimal >>> 0).toString(16).padStart(6, "0");
}

async function loadUpcomingGames(teamId, currentWeekIndex) {
  const weeksToShow = [currentWeekIndex - 1, currentWeekIndex, currentWeekIndex + 1];
  const gamesContainer = document.getElementById("upcomingGames");

  for (const weekIndex of weeksToShow) {
    const weekRef = ref(db, `data/xbsx/20390713/schedules/reg/${weekIndex}`);
    const weekSnap = await get(weekRef);
    if (!weekSnap.exists()) continue;

    const weekGames = weekSnap.val();
    console.log("Week", weekIndex, "games", weekGames);

    for (const gameId in weekGames) {
      const game = weekGames[gameId];
      const homeId = game.homeTeamId;
      const awayId = game.awayTeamId;

      // Check if current team is involved
      if (String(homeId) !== String(teamId) && String(awayId) !== String(teamId)) continue;

      const isHome = String(homeId) === String(teamId);
      const opponentId = isHome ? awayId : homeId;
      const vsSymbol = isHome ? "VS" : "@";

      const teamScore = isHome ? game.homeScore : game.awayScore;
      const oppScore = isHome ? game.awayScore : game.homeScore;

      // Use the game's actual weekIndex if available, fallback to loop weekIndex
      const displayWeek = (game.weekIndex ?? weekIndex) + 1;

      let result = "TBD";
      if (teamScore != null && oppScore != null) {
        result = teamScore > oppScore ? "W" : teamScore < oppScore ? "L" : "T";
      }

      const scoreDisplay = teamScore != null && oppScore != null ? `${teamScore}-${oppScore}` : "--";
      console.log(`Week ${displayWeek}: ${isHome ? 'HOME' : 'AWAY'} vs ${opponentId} | Score: ${scoreDisplay} Result: ${result}`);

const trueScheduleId = game.scheduleId ?? gameId; // safe fallback to the loop key
const scoreLink = `game.html?scheduleId=${trueScheduleId}`;

const opponentMetaRef = ref(db, `data/xbsx/20390713/teams/${opponentId}/meta`);
const metaSnap = await get(opponentMetaRef);
const opponent = metaSnap.exists() ? metaSnap.val() : {};

const row = document.createElement("div");
row.className = "game-row";
row.innerHTML = `
  <span><strong>Week ${displayWeek}</strong></span>
  <span>${vsSymbol}</span>
  <img loading="lazy" width="24" height="24"
       src="images/logos/${opponent.logoId}.png"
       alt="${opponent.abbrName} logo"
       class="opponent-logo">
  <a href="teams.html?teamId=${opponentId}" class="opponent-link">${opponent.abbrName}</a>
  <a href="${scoreLink}" class="game-score">${scoreDisplay} ${result}</a>
`;


      gamesContainer.appendChild(row);
    }
  }
}

async function loadSchedule(teamId) {
  const scheduleList = document.getElementById("scheduleList");
  const seasonFilter = document.getElementById("seasonFilter");

  const renderSchedule = async () => {
    scheduleList.innerHTML = "<p>Loading schedule...</p>";
    const seasonType = seasonFilter.value;
const baseRef = ref(db, `data/xbsx/20390713/schedules/${seasonType}`);
const snap = await get(baseRef);
if (!snap.exists()) {
  scheduleList.innerHTML = "<p>No games found for this season.</p>";
  return;
}

const weeks = snap.val();
const items = [];

for (const weekIdx in weeks) {
  const weekGames = weeks[weekIdx];
  for (const scheduleId in weekGames) {    // <-- key is scheduleId here
    const game = weekGames[scheduleId];
    const homeId = game.homeTeamId;
    const awayId = game.awayTeamId;

    if (String(homeId) !== teamId && String(awayId) !== teamId) continue;

    const isHome = String(homeId) === String(teamId);
    const opponentId = isHome ? awayId : homeId;
    const vsSymbol = isHome ? "VS" : "@";

    const teamScore = isHome ? game.homeScore : game.awayScore;
    const oppScore = isHome ? game.awayScore : game.homeScore;

    const result = teamScore != null && oppScore != null
      ? (teamScore > oppScore ? "W" : teamScore < oppScore ? "L" : "T")
      : "TBD";
    const scoreDisplay = teamScore != null && oppScore != null ? `${teamScore}-${oppScore}` : "--";

    const opponentMetaRef = ref(db, `data/xbsx/20390713/teams/${opponentId}/meta`);
    const oppSnap = await get(opponentMetaRef);
    const opponent = oppSnap.exists() ? oppSnap.val() : {};

const trueScheduleId = game.scheduleId ?? scheduleId; // fallback to loop key if missing
const scoreLink = `game.html?scheduleId=${trueScheduleId}`;
    const item = document.createElement("div");
    item.className = "schedule-item";
   item.innerHTML = `
  <div>Week ${weekIdx}</div>
  <div>${vsSymbol}
    <img loading="lazy" width="24" height="24"
         src="images/logos/${opponent.logoId}.png"
         alt="${opponent.abbrName} logo"
         class="opponent-logo">
    <a href="teams.html?teamId=${opponentId}" class="opponent-link">${opponent.abbrName}</a>
  </div>
  <div class="game-score"><a href="${scoreLink}">${scoreDisplay} ${result}</a></div>
`;
    items.push(item);
  }
}

    scheduleList.innerHTML = "";
    if (items.length) items.forEach(i => scheduleList.appendChild(i));
    else scheduleList.innerHTML = "<p>No games found for this team in the selected season.</p>";
  };

  seasonFilter.addEventListener("change", renderSchedule);
  renderSchedule();
}


async function loadAggregatedStats(teamId) {
  const statCategories = {
    passing: [],
    rushing: [],
    receiving: [],
    defense: [],
    kicking: []
  };

  // Fetch team roster once for player names & positions
  const rosterRef = ref(db, `data/xbsx/20390713/teams/${teamId}/roster`);
  const rosterSnap = await get(rosterRef);
  const rosterData = rosterSnap.exists() ? rosterSnap.val() : {};
  console.log("Fetched roster data:", rosterData);

  // Combine pre & reg season
  const seasons = ['pre', 'reg'];

  for (const season of seasons) {
    const statsBaseRef = ref(db, `data/xbsx/20390713/stats/${season}`);
    const statsSnap = await get(statsBaseRef);
    if (!statsSnap.exists()) {
      console.log(`No stats for season: ${season}`);
      continue;
    }
    const weeks = statsSnap.val();
    console.log(`Weeks found for season ${season}:`, weeks);

    for (const weekIdx in weeks) {
      const weekData = weeks[weekIdx];
      const teamStats = weekData[teamId];
      if (!teamStats || !teamStats["player-stats"]) {
        console.log(`No player stats for team ${teamId} in week ${weekIdx}`);
        continue;
      }
      const playerStats = teamStats["player-stats"];
      console.log(`Player stats for team ${teamId} in week ${weekIdx}:`, playerStats);

      for (const playerId in playerStats) {
        const stats = playerStats[playerId];
        const rosterEntry = Object.values(rosterData).find(p => p.rosterId == stats.rosterId);

        if (!rosterEntry) continue;

        const pos = rosterEntry.position;
        const name = rosterEntry.fullName || stats.fullName || "Unknown";

        // Determine categories dynamically
        const categoriesForPlayer = [];
        const keys = Object.keys(stats).map(k => k.toLowerCase());

        if (keys.some(k => k.startsWith("pass"))) categoriesForPlayer.push("passing");
        if (keys.some(k => k.startsWith("rush"))) categoriesForPlayer.push("rushing");
        if (keys.some(k => k.startsWith("rec"))) categoriesForPlayer.push("receiving");
        if (keys.some(k => k.startsWith("def"))) categoriesForPlayer.push("defense");
        if (keys.some(k => k.startsWith("fg") || k.startsWith("xp") || k.includes("kickoff"))) categoriesForPlayer.push("kicking");

categoriesForPlayer.forEach(category => {
  let existingPlayer = statCategories[category].find(p => p.playerId === playerId);
  if (!existingPlayer) {
    existingPlayer = { playerId, name, pos };
    statCategories[category].push(existingPlayer);
  }

  for (const key in stats) {
    if (["playerId", "name", "pos", "rosterId", "fullName"].includes(key)) continue;

    let val = parseFloat(stats[key]);
    if (isNaN(val)) val = 0;

    if (key === "passerRating") {
      // Track sum and count to calculate average later
      existingPlayer._passerRatingSum = (existingPlayer._passerRatingSum || 0) + val;
      existingPlayer._passerRatingGames = (existingPlayer._passerRatingGames || 0) + 1;
    } else {
      existingPlayer[key] = (existingPlayer[key] || 0) + val;
    }
  }
});
      }
    }
  }
  // Compute passerRating averages after aggregation
statCategories.passing.forEach(player => {
  if (player._passerRatingGames) {
    player.passerRating = (player._passerRatingSum / player._passerRatingGames);
    delete player._passerRatingSum;
    delete player._passerRatingGames;
  }
});


  // Now render stats tables
  renderStatsTable(statCategories.passing, "passingTable", ["name", "passAtt", "passComp", "passYds", "passTDs", "passInts", "passerRating"]);
  renderStatsTable(statCategories.rushing, "rushingTable", ["name", "rushAtt", "rushYds", "rushTDs", "rushLongest", "rushYdsPerAtt"]);
  renderStatsTable(statCategories.receiving, "receivingTable", ["name", "recCatches", "recYds", "recTDs", "recLongest", "recYdsPerCatch"]);
  renderStatsTable(statCategories.defense, "defenseTable", ["name", "defTotalTackles", "defSacks", "defInts", "defForcedFum", "defFumRec", "defSafeties", "defTDs"]);
  renderStatsTable(statCategories.kicking, "kickingTable", ["name", "fGAtt", "fGMade", "fGCompPct", "xPMade", "xPAtt", "kickoffAtt", "kickoffTBs"]);
}



function renderStatsTable(players, tableId, columns) {
  const container = document.getElementById(tableId);
  if (!container) return;

  if (!players.length) {
    container.innerHTML = "<p>No stats available.</p>";
    return;
  }

  const table = document.createElement("table");
  table.className = "player-stats-table";

  const friendlyLabels = {
  passAtt: "Pass Att",
  passComp: "Pass Comp",
  passYds: "Pass Yards",
  passTDs: "Pass TDs",
  passInts: "INTs",
  passerRating: "Rating",
  rushAtt: "Rush Att",
  rushYds: "Rush Yards",
  rushTDs: "Rush TDs",
  rushLongest: "Longest Rush",
  rushYdsPerAtt: "Yards/Carry",
  recCatches: "Catches",
  recYds: "Receiving Yards",
  recTDs: "Receiving TDs",
  recLongest: "Longest Rec",
  recYdsPerCatch: "Yards/Catch",
  defTotalTackles: "Total Tackles",
  defSacks: "Sacks",
  defInts: "Interceptions",
  defForcedFum: "Forced Fumbles",
  defFumRec: "Fumble Rec.",
  defSafeties: "Safeties",
  defTDs: "Def TDs",
  fGAtt: "FG Att",
  fGMade: "FG Made",
  fGCompPct: "FG%",
  xPMade: "XP Made",
  xPAtt: "XP Att",
  kickoffAtt: "Kickoffs",
  kickoffTBs: "Touchbacks",
  name: "Player"
};
  
// Header
const thead = document.createElement("thead");
const headerRow = document.createElement("tr");

columns.forEach(col => {
  const th = document.createElement("th");
  th.textContent = friendlyLabels[col] || col; // use friendly labels

  // Make columns clickable to sort
  th.style.cursor = "pointer";
  th.addEventListener("click", () => sortTableByColumn(table, columns.indexOf(col)));
  
  headerRow.appendChild(th);
});
thead.appendChild(headerRow);
table.appendChild(thead);

  // Body
  const tbody = document.createElement("tbody");
  players.forEach(player => {
    const row = document.createElement("tr");
    columns.forEach(col => {
      const td = document.createElement("td");

      if (col === "name" && player.playerId) {
        const link = document.createElement("a");
        link.href = `player.html?rosterId=${player.playerId}`;
        link.textContent = player[col] !== undefined ? player[col] : "--";
        link.classList.add("player-link");
        td.appendChild(link);
      } else {
        let val = player[col] !== undefined ? player[col] : "--";
        if (typeof val === "number") {
          val = Number.isInteger(val) ? val : val.toFixed(2);
        }
        td.textContent = val;
      }

      row.appendChild(td);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  container.innerHTML = "";
  container.appendChild(table);
}

function sortTableByColumn(table, columnIndex) {
  const tbody = table.querySelector("tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));

  // Determine if already sorted ascending or descending
  const currentSort = table.getAttribute("data-sort-column");
  const currentDirection = table.getAttribute("data-sort-direction") || "asc";
  const isSameColumn = currentSort == columnIndex;
  const newDirection = isSameColumn && currentDirection === "asc" ? "desc" : "asc";

  rows.sort((a, b) => {
    const cellA = a.children[columnIndex].textContent.trim();
    const cellB = b.children[columnIndex].textContent.trim();

    // Convert to numbers if possible
    const valA = parseFloat(cellA.replace(/[^\d.-]/g, ""));
    const valB = parseFloat(cellB.replace(/[^\d.-]/g, ""));

    if (!isNaN(valA) && !isNaN(valB)) {
      return newDirection === "asc" ? valA - valB : valB - valA;
    }
    // Fallback to string comparison
    return newDirection === "asc" ? cellA.localeCompare(cellB) : cellB.localeCompare(cellA);
  });

  // Rebuild the tbody
  rows.forEach(row => tbody.appendChild(row));

  table.setAttribute("data-sort-column", columnIndex);
  table.setAttribute("data-sort-direction", newDirection);
}

async function loadTeamData() {
  const teamId = getTeamIdFromURL();
  if (!teamId) {
    console.error("No teamId in URL");
    return;
  }

  const teamRef = ref(db, `data/xbsx/20390713/teams/${teamId}`);
  const snapshot = await get(teamRef);

  if (!snapshot.exists()) {
    console.error("Team not found");
    return;
  }

  const data = snapshot.val();
  const meta = data.meta || {};
  const standings = data.standings || {};

  const record = `${standings.totalWins || 0}-${standings.totalLosses || 0}${standings.totalTies ? `-${standings.totalTies}` : ""}`;

  // Populate DOM
  const teamLogoEl = document.getElementById("teamLogo");
teamLogoEl.src = `images/logos/${meta.logoId}.png`;
teamLogoEl.alt = `${meta.abbrName} logo`;
teamLogoEl.setAttribute("width", "96");   // adjust if your CSS expects another size
teamLogoEl.setAttribute("height", "96");  // adjust if your CSS expects another size
// Note: keeping this one non-lazy is good since it’s above the fold
  document.getElementById("teamName").textContent = `${meta.cityName || ""} ${meta.displayName || ""}`;
  document.getElementById("teamDivision").textContent = meta.divName || "";
  document.getElementById("teamCoach").textContent = meta.userName || "N/A";
  document.getElementById("teamRecord").textContent = record;
  document.getElementById("teamRank").textContent = standings.rank ?? "--";
  document.getElementById("teamOverall").textContent = meta.ovrRating ?? "--";

  // Format cap values
const capRoom = formatMillions(standings.capRoom || 0);
const capSpent = formatMillions(standings.capSpent || 0);

let capAvailableRaw = standings.capAvailable || 0;
let capAvailableFormatted = "";

if (capAvailableRaw >= 1_000_000) {
  capAvailableFormatted = formatMillions(capAvailableRaw);
} else {
  capAvailableFormatted = formatThousands(capAvailableRaw);
}

document.getElementById("capRoom").textContent = `$${capRoom}`;
document.getElementById("capSpent").textContent = `$${capSpent}`;
document.getElementById("capAvailable").textContent = `$${capAvailableFormatted}`;

  // Populate Offensive Stats
document.getElementById("offPassYds").textContent = standings.offPassYds ?? "--";
document.getElementById("offPassYdsRank").textContent = standings.offPassYdsRank ?? "--";
document.getElementById("offRushYds").textContent = standings.offRushYds ?? "--";
document.getElementById("offRushYdsRank").textContent = standings.offRushYdsRank ?? "--";
document.getElementById("offTotalYds").textContent = standings.offTotalYds ?? "--";
document.getElementById("offTotalYdsRank").textContent = standings.offTotalYdsRank ?? "--";
document.getElementById("ptsFor").textContent = standings.ptsFor ?? "--";
document.getElementById("ptsForRank").textContent = standings.ptsForRank ?? "--";

// Populate Defensive Stats
document.getElementById("defPassYds").textContent = standings.defPassYds ?? "--";
document.getElementById("defPassYdsRank").textContent = standings.defPassYdsRank ?? "--";
document.getElementById("defRushYds").textContent = standings.defRushYds ?? "--";
document.getElementById("defRushYdsRank").textContent = standings.defRushYdsRank ?? "--";
document.getElementById("defTotalYds").textContent = standings.defTotalYds ?? "--";
document.getElementById("defTotalYdsRank").textContent = standings.defTotalYdsRank ?? "--";
document.getElementById("ptsAgainst").textContent = standings.ptsAgainst ?? "--";
document.getElementById("ptsAgainstRank").textContent = standings.ptsAgainstRank ?? "--";


if (meta.primaryColor) {
  const color = decimalToHexColor(meta.primaryColor);
  document.querySelector(".team-header").style.backgroundColor = color;
  document.querySelector(".team-header").style.borderColor = color;
  document.documentElement.style.setProperty('--team-accent', color);
} 
  loadUpcomingGames(teamId, standings.weekIndex ?? 0);
  loadSchedule(teamId);
}

// Tab logic
const tabButtons = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");

tabButtons.forEach(button => {
  button.addEventListener("click", () => {
    const tab = button.getAttribute("data-tab");

    tabButtons.forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");

    tabContents.forEach(content => {
      content.classList.remove("active");
      if (content.id === `tab-${tab}`) content.classList.add("active");
    });

    if (tab === "statistics") {
      loadAggregatedStats(getTeamIdFromURL());
    }
  });
});

loadTeamData();
