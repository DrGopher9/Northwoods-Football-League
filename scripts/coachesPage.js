import { db } from "./firebaseConfig.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const LEAGUE_PATH = "data/xbsx/20390713";
const COACHES_PATH = "config/coaches";

document.addEventListener("DOMContentLoaded", () => {
  initDirectory();
});

async function initDirectory() {
  const loader = document.getElementById("global-loader");
  const content = document.getElementById("main-content");

  try {
    // Fetch teams and coaches data concurrently
    const [teamsSnap, coachesSnap] = await Promise.all([
      get(ref(db, `${LEAGUE_PATH}/teams`)),
      get(ref(db, COACHES_PATH))
    ]);

    const teamsMeta = teamsSnap.exists() ? extractTeamsMeta(teamsSnap.val()) : {};
    const coaches = coachesSnap.exists() ? coachesSnap.val() : {};

    renderDirectory(coaches, teamsMeta);

    loader.style.display = "none";
    content.style.display = "block";

  } catch (error) {
    console.error("Failed to load directory:", error);
    loader.innerHTML = `<div style="color: #f44336;">Failed to load directory. Check connection.</div>`;
  }
}

function extractTeamsMeta(rawTeamsData) {
  const out = {};
  for (const [teamId, node] of Object.entries(rawTeamsData)) {
    out[teamId] = node.meta || {};
  }
  return out;
}

function renderDirectory(coaches, teamsMeta) {
  const grid = document.getElementById("coachesGrid");
  if (!grid) return;
  
  grid.innerHTML = "";

  // Sort teams alphabetically by City + Mascot
  const teamKey = (id) => {
    const m = teamsMeta[id] || {};
    return [m.cityName, m.displayName].filter(Boolean).join(" ").trim().toLowerCase();
  };

  const entries = Object.entries(coaches).sort((a, b) => teamKey(a[0]).localeCompare(teamKey(b[0])));

  if (!entries.length) {
    grid.innerHTML = `<p style="color: #a1a1aa; grid-column: 1/-1; text-align: center;">No coaches configured yet. Add them in the Admin page.</p>`;
    return;
  }

  for (const [teamId, c] of entries) {
    const meta = teamsMeta[teamId] || {};
    const teamName = [meta.cityName, meta.displayName].filter(Boolean).join(" ") || "Unknown Team";
    const logo = meta.logoId ? `images/logos/${meta.logoId}.png` : "images/logos/default.png";
    const teamLink = `teams.html?teamId=${teamId}`;

    const platform = (c.broadcast?.platform || "").trim();
    const url = (c.broadcast?.url || "").trim();
    
    let broadcastHtml = `<span class="coach-meta-value">—</span>`;
    if (platform) {
      broadcastHtml = url 
        ? `<a href="${url}" target="_blank" rel="noopener" class="broadcast-link">${platform}</a>` 
        : `<span class="coach-meta-value">${platform}</span>`;
    }

    const card = document.createElement("a");
    card.href = teamLink;
    card.className = "coach-card";
    
    card.innerHTML = `
      <div class="coach-card-header">
        <img src="${logo}" alt="${meta.abbrName}" class="coach-team-logo" loading="lazy">
        <h2 class="coach-team-name">${teamName}</h2>
      </div>
      <div class="coach-card-body">
        <div class="coach-meta-row">
          <span class="coach-meta-label">Coach</span>
          <span class="coach-meta-value highlight">${c.coachName || "CPU"}</span>
        </div>
        <div class="coach-meta-row">
          <span class="coach-meta-label">Gamertag</span>
          <span class="coach-meta-value">${c.psn || "—"}</span>
        </div>
        <div class="coach-meta-row">
          <span class="coach-meta-label">Timezone</span>
          <span class="coach-meta-value">${c.timezone || "—"}</span>
        </div>
        <div class="coach-meta-row">
          <span class="coach-meta-label">Broadcast</span>
          ${broadcastHtml}
        </div>
      </div>
    `;

    grid.appendChild(card);
  }
}
