import { db } from "./firebaseConfig.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const LEAGUE_PATH = "data/xbsx/20390713";

document.addEventListener("DOMContentLoaded", () => {
  initTeamPage();
});

function getTeamIdFromURL() {
  return new URLSearchParams(window.location.search).get("teamId");
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

async function initTeamPage() {
  const teamId = getTeamIdFromURL();
  const loader = document.getElementById("global-loader");
  const content = document.getElementById("main-content");

  if (!teamId) {
    loader.innerHTML = `<div style="color: #f44336;">No Team Selected. Please select a team from the Directory.</div>`;
    return;
  }

  try {
    setupTabs(teamId);
    await loadTeamData(teamId);
    
    loader.style.display = "none";
    content.style.display = "block";
  } catch (error) {
    console.error("Error initializing team page:", error);
    loader.innerHTML = `<div style="color: #f44336;">Error loading team data.</div>`;
  }
}

function setupTabs(teamId) {
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  let statsLoaded = false;
  let depthLoaded = false;

  tabButtons.forEach(button => {
    button.addEventListener("click", () => {
      const tab = button.getAttribute("data-tab");

      tabButtons.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");

      tabContents.forEach(content => {
        content.classList.remove("active");
        if (content.id === `tab-${tab}`) content.classList.add("active");
      });

      if (tab === "statistics" && !statsLoaded) {
        loadAggregatedStats(teamId);
        statsLoaded = true;
      }
      if (tab === "depth" && !depthLoaded) {
        loadDepthChart(teamId);
        depthLoaded = true;
      }
    });
  });
}

async function loadTeamData(teamId) {
  const teamRef = ref(db, `${LEAGUE_PATH}/teams/${teamId}`);
  const snapshot = await get(teamRef);

  if (!snapshot.exists()) {
    throw new Error("Team not found in database.");
  }

  const data = snapshot.val();
  const meta = data.meta || {};
  const standings = data.standings || {};

  if (meta.primaryColor) {
    const color = decimalToHexColor(meta.primaryColor);
    document.documentElement.style.setProperty('--team-accent', color);
  } 

  document.getElementById("teamLogo").src = `images/logos/${meta.logoId}.png`;
  document.getElementById("teamName").textContent = `${meta.cityName || ""} ${meta.displayName || ""}`;
  document.getElementById("teamDivision").textContent = meta.divName || "";
  document.getElementById("teamCoach").textContent = meta.userName || "CPU";
  document.getElementById("teamOverall").textContent = meta.ovrRating ?? "--";
  document.getElementById("teamRank").textContent = standings.rank ?? "--";

  const record = `${standings.totalWins || 0}-${standings.totalLosses || 0}${standings.totalTies ? `-${standings.totalTies}` : ""}`;
  document.getElementById("teamRecord").textContent = record;

  document.getElementById("capRoom").textContent = `$${formatMillions(standings.capRoom || 0)}`;
  document.getElementById("capSpent").textContent = `$${formatMillions(standings.capSpent || 0)}`;
  
  const capAvail = standings.capAvailable || 0;
  document.getElementById("capAvailable").textContent = capAvail >= 1000000 ? `$${formatMillions(capAvail)}` : `$${formatThousands(capAvail)}`;

  const mapStat = (id, val, rankId, rankVal) => {
    document.getElementById(id).textContent = val ?? "--";
    document.getElementById(rankId).textContent = rankVal ? `(${rankVal})` : "";
  };

  mapStat("offPassYds", standings.offPassYds, "offPassYdsRank", standings.offPassYdsRank);
  mapStat("offRushYds", standings.offRushYds, "offRushYdsRank", standings.offRushYdsRank);
  mapStat("offTotalYds", standings.offTotalYds, "offTotalYdsRank", standings.offTotalYdsRank);
  mapStat("ptsFor", standings.ptsFor, "ptsForRank", standings.ptsForRank);

  mapStat("defPassYds", standings.defPassYds, "defPassYdsRank", standings.defPassYdsRank);
  mapStat("defRushYds", standings.defRushYds, "defRushYdsRank", standings.defRushYdsRank);
  mapStat("defTotalYds", standings.defTotalYds, "defTotalYdsRank", standings.defTotalYdsRank);
  mapStat("ptsAgainst", standings.ptsAgainst, "ptsAgainstRank", standings.ptsAgainstRank);

  loadUpcomingGames(teamId, standings.weekIndex ?? 0);
  loadSchedule(teamId);
}

// ---- SUB COMPONENTS ----

async function loadUpcomingGames(teamId, currentWeekIndex) {
  const weeksToShow = [currentWeekIndex - 1, currentWeekIndex, currentWeekIndex + 1];
  const container = document.getElementById("upcomingGames");
  container.innerHTML = "";

  const seenGames = new Set(); // Prevent duplicates

  for (const weekIndex of weeksToShow) {
    const snap = await get(ref(db, `${LEAGUE_PATH}/schedules/reg/${weekIndex}`));
    if (!snap.exists()) continue;

    const games = snap.val();
    for (const gameId in games) {
      const game = games[gameId];
      if (!game || (String(game.homeTeamId) !== teamId && String(game.awayTeamId) !== teamId)) continue;

      // Duplicate Check
      const uniqueKey = `${weekIndex}-${game.homeTeamId}-${game.awayTeamId}`;
      if (seenGames.has(uniqueKey)) continue;
      seenGames.add(uniqueKey);

      const isHome = String(game.homeTeamId) === teamId;
      const oppId = isHome ? game.awayTeamId : game.homeTeamId;
      
      const oppSnap = await get(ref(db, `${LEAGUE_PATH}/teams/${oppId}/meta`));
      const opp = oppSnap.exists() ? oppSnap.val() : { abbrName: "UNK", logoId: "default" };

      const teamScore = isHome ? game.homeScore : game.awayScore;
      const oppScore = isHome ? game.awayScore : game.homeScore;
      
      let result = "TBD";
      if (teamScore != null && oppScore != null) {
        result = teamScore > oppScore ? "W" : teamScore < oppScore ? "L" : "T";
      }

      // Safe week formatting (handle 0-index if needed)
      let safeWeek = isNaN(Number(weekIndex)) ? weekIndex : (Number(weekIndex) === 0 ? 1 : weekIndex);

      const row = document.createElement("div");
      row.className = "game-row";
      row.innerHTML = `
        <span style="font-weight: bold; width: 60px;">Wk ${safeWeek}</span>
        <span style="color: var(--text-muted);">${isHome ? "vs" : "@"}</span>
        <img src="images/logos/${opp.logoId}.png" class="opponent-logo" alt="logo">
        <a href="teams.html?teamId=${oppId}" class="opponent-link">${opp.abbrName}</a>
        <a href="game.html?scheduleId=${game.scheduleId ?? gameId}" class="game-score">${teamScore ?? '-'}-${oppScore ?? '-'} <span style="font-size: 0.8rem;">${result}</span></a>
      `;
      container.appendChild(row);
    }
  }
}

async function loadSchedule(teamId) {
  const list = document.getElementById("scheduleList");
  const filter = document.getElementById("seasonFilter");

  const renderSched = async () => {
    list.innerHTML = `<p class="muted">Loading schedule...</p>`;
    const snap = await get(ref(db, `${LEAGUE_PATH}/schedules/${filter.value}`));
    
    if (!snap.exists()) {
      list.innerHTML = `<p class="muted">No games found.</p>`;
      return;
    }

    list.innerHTML = "";
    const weeks = snap.val();
    const sortedWeeks = Object.keys(weeks).sort((a, b) => Number(a) - Number(b));
    
    const seenGames = new Set(); // Deduplication

    for (const weekIdx of sortedWeeks) {
      for (const gameId in weeks[weekIdx]) {
        const game = weeks[weekIdx][gameId];
        if (!game || (String(game.homeTeamId) !== teamId && String(game.awayTeamId) !== teamId)) continue;

        // Ensure we only render one instance of a matchup per week
        const uniqueKey = `${weekIdx}-${game.homeTeamId}-${game.awayTeamId}`;
        if (seenGames.has(uniqueKey)) continue;
        seenGames.add(uniqueKey);

        const isHome = String(game.homeTeamId) === teamId;
        const oppId = isHome ? game.awayTeamId : game.homeTeamId;
        
        const oppSnap = await get(ref(db, `${LEAGUE_PATH}/teams/${oppId}/meta`));
        const opp = oppSnap.exists() ? oppSnap.val() : { abbrName: "UNK", logoId: "default" };

        const teamScore = isHome ? game.homeScore : game.awayScore;
        const oppScore = isHome ? game.awayScore : game.homeScore;
        const result = teamScore != null && oppScore != null ? (teamScore > oppScore ? "W" : teamScore < oppScore ? "L" : "T") : "TBD";

        let safeWeek = isNaN(Number(weekIdx)) ? weekIdx : (Number(weekIdx) === 0 ? 1 : weekIdx);

        const item = document.createElement("div");
        item.className = "schedule-item";
        item.innerHTML = `
          <div style="font-weight: bold; color: var(--text-muted);">Week ${safeWeek}</div>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="color: var(--text-muted); font-size: 0.9rem; width: 1.5rem; text-align: right;">${isHome ? "vs" : "@"}</span>
            <img src="images/logos/${opp.logoId}.png" class="opponent-logo" alt="logo" style="width: 28px; height: 28px; object-fit: contain;">
            <a href="teams.html?teamId=${oppId}" class="opponent-link" style="margin: 0; font-size: 1.1rem;">${opp.abbrName}</a>
          </div>
          <a href="game.html?scheduleId=${game.scheduleId ?? gameId}" class="game-score" style="font-size: 1.15rem; justify-self: end; color: var(--accent-blue);">
            ${teamScore ?? '-'}-${oppScore ?? '-'} 
            <span style="font-size: 0.9rem; color: var(--text-main); margin-left: 0.4rem;" class="${result === 'W' ? 'highlight' : ''}">${result}</span>
          </a>
        `;
        list.appendChild(item);
      }
    }
  };

  filter.addEventListener("change", renderSched);
  renderSched();
}

// ----- DEPTH CHART -----
async function loadDepthChart(teamId) {
  const offContainer = document.querySelector("#depth-offense .depth-list");
  const defContainer = document.querySelector("#depth-defense .depth-list");

  offContainer.innerHTML = "<p class='muted'>Loading roster...</p>";
  defContainer.innerHTML = "<p class='muted'>Loading roster...</p>";

  try {
    const snap = await get(ref(db, `${LEAGUE_PATH}/teams/${teamId}/roster`));
    if (!snap.exists()) {
      offContainer.innerHTML = "<p class='muted'>No roster data found.</p>";
      defContainer.innerHTML = "";
      return;
    }

    const roster = Object.values(snap.val());
    
    const positions = {
      offense: ['QB', 'HB', 'FB', 'WR', 'TE', 'LT', 'LG', 'C', 'RG', 'RT'],
      defense: ['LE', 'RE', 'DT', 'LOLB', 'MLB', 'ROLB', 'CB', 'FS', 'SS', 'K', 'P']
    };

    const grouped = {};
    roster.forEach(p => {
      const pos = p.position;
      if (!grouped[pos]) grouped[pos] = [];
      grouped[pos].push(p);
    });

    Object.keys(grouped).forEach(pos => {
      grouped[pos].sort((a, b) => (b.playerBestOvr || 0) - (a.playerBestOvr || 0));
    });

    const renderGroup = (posArray, container) => {
      container.innerHTML = "";
      posArray.forEach(pos => {
        if (!grouped[pos] || grouped[pos].length === 0) return;
        
        let html = `<div class="depth-position-group"><div class="depth-position-title">${pos}</div>`;
        grouped[pos].slice(0, 4).forEach((player, idx) => {
           const name = player.fullName || `${player.firstName} ${player.lastName}`;
           html += `<div class="depth-player-row">
                      <span class="depth-rank">${idx + 1}</span>
                      <a href="#" class="depth-name">${name}</a>
                      <span class="depth-ovr">${player.playerBestOvr || '--'}</span>
                    </div>`;
        });
        html += `</div>`;
        container.insertAdjacentHTML("beforeend", html);
      });
    };

    renderGroup(positions.offense, offContainer);
    renderGroup(positions.defense, defContainer);

  } catch(e) {
    console.error("Depth chart error:", e);
    offContainer.innerHTML = "<p class='muted'>Error loading depth chart.</p>";
    defContainer.innerHTML = "";
  }
}

// ----- HEAVY STATS AGGREGATION -----
async function loadAggregatedStats(teamId) {
  const statCategories = { passing: [], rushing: [], receiving: [], defense: [], kicking: [] };

  try {
    const rosterSnap = await get(ref(db, `${LEAGUE_PATH}/teams/${teamId}/roster`));
    const rosterData = rosterSnap.exists() ? rosterSnap.val() : {};

    for (const season of ['pre', 'reg']) {
      const statsSnap = await get(ref(db, `${LEAGUE_PATH}/stats/${season}`));
      if (!statsSnap.exists()) continue;

      const weeks = statsSnap.val();
      for (const weekIdx in weeks) {
        const teamStats = weeks[weekIdx][teamId];
        if (!teamStats || !teamStats["player-stats"]) continue;

        for (const playerId in teamStats["player-stats"]) {
          const stats = teamStats["player-stats"][playerId];
          const rosterEntry = Object.values(rosterData).find(p => p.rosterId == stats.rosterId);
          if (!rosterEntry) continue;

          const keys = Object.keys(stats).map(k => k.toLowerCase());
          const cats = [];
          if (keys.some(k => k.startsWith("pass"))) cats.push("passing");
          if (keys.some(k => k.startsWith("rush"))) cats.push("rushing");
          if (keys.some(k => k.startsWith("rec"))) cats.push("receiving");
          if (keys.some(k => k.startsWith("def"))) cats.push("defense");
          if (keys.some(k => k.startsWith("fg") || k.startsWith("xp") || k.includes("kickoff"))) cats.push("kicking");

          cats.forEach(cat => {
            let player = statCategories[cat].find(p => p.playerId === playerId);
            if (!player) {
              player = { playerId, name: rosterEntry.fullName || stats.fullName || "Unknown", pos: rosterEntry.position };
              statCategories[cat].push(player);
            }

            for (const key in stats) {
              if (["playerId", "name", "pos", "rosterId", "fullName"].includes(key)) continue;
              let val = parseFloat(stats[key]) || 0;
              
              if (key === "passerRating") {
                player._prSum = (player._prSum || 0) + val;
                player._prGames = (player._prGames || 0) + 1;
              } else {
                player[key] = (player[key] || 0) + val;
              }
            }
          });
        }
      }
    }

    statCategories.passing.forEach(p => {
      if (p._prGames) { p.passerRating = (p._prSum / p._prGames); }
    });

    renderStatsTable(statCategories.passing, "passingTable", ["name", "passAtt", "passComp", "passYds", "passTDs", "passInts", "passerRating"]);
    renderStatsTable(statCategories.rushing, "rushingTable", ["name", "rushAtt", "rushYds", "rushTDs", "rushLongest", "rushYdsPerAtt"]);
    renderStatsTable(statCategories.receiving, "receivingTable", ["name", "recCatches", "recYds", "recTDs", "recLongest", "recYdsPerCatch"]);
    renderStatsTable(statCategories.defense, "defenseTable", ["name", "defTotalTackles", "defSacks", "defInts", "defForcedFum", "defFumRec", "defTDs"]);
    renderStatsTable(statCategories.kicking, "kickingTable", ["name", "fGAtt", "fGMade", "xPMade", "xPAtt"]);

  } catch (err) {
    console.error("Stats Error:", err);
  }
}

function renderStatsTable(players, tableId, columns) {
  const container = document.getElementById(tableId);
  if (!players.length) { container.innerHTML = `<p class="muted">No stats available.</p>`; return; }

  const labels = {
    name: "Player", passAtt: "Att", passComp: "Cmp", passYds: "Yds", passTDs: "TD", passInts: "INT", passerRating: "RTG",
    rushAtt: "Att", rushYds: "Yds", rushTDs: "TD", rushLongest: "Lng", rushYdsPerAtt: "Y/A",
    recCatches: "Rec", recYds: "Yds", recTDs: "TD", recLongest: "Lng", recYdsPerCatch: "Y/C",
    defTotalTackles: "Tkl", defSacks: "Sck", defInts: "INT", defForcedFum: "FF", defFumRec: "FR", defTDs: "TD",
    fGAtt: "FGA", fGMade: "FGM", xPAtt: "XPA", xPMade: "XPM"
  };

  let html = `<table class="player-stats-table"><thead><tr>`;
  columns.forEach(c => html += `<th>${labels[c] || c}</th>`);
  html += `</tr></thead><tbody>`;

  players.forEach(p => {
    html += `<tr>`;
    columns.forEach(c => {
      if (c === "name") {
        html += `<td><a href="#" class="player-link">${p.name}</a></td>`;
      } else {
        let val = p[c] ?? "--";
        if (typeof val === "number") val = Number.isInteger(val) ? val : val.toFixed(1);
        html += `<td>${val}</td>`;
      }
    });
    html += `</tr>`;
  });
  
  html += `</tbody></table>`;
  container.innerHTML = html;
}
