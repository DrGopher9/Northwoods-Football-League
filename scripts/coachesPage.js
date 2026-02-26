// scripts/coachesPage.js
import { db } from "./firebaseConfig.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Updated Firebase paths
const LEAGUE_PATH = "data/xbsx/20390713";
const COACHES_PATH = "config/coaches";


// Helper: build a TD safely
function td(html) { const el = document.createElement("td"); el.innerHTML = html; return el; }

async function loadTeamsMeta() {
  const snap = await get(ref(db, `${LEAGUE_PATH}/teams`));
  if (!snap.exists()) return {};
  const raw = snap.val();
  const out = {};
  for (const [teamId, node] of Object.entries(raw)) {
    out[teamId] = node.meta || {};
  }
  return out;
}

async function loadCoaches() {
  const snap = await get(ref(db, COACHES_PATH));
  return snap.exists() ? snap.val() : {};
}

function render(coaches, teamsMeta) {
  const tbody = document.getElementById("coachesTbody");
  if (!tbody) return;
  tbody.innerHTML = "";

// Sort by full team name (City + DisplayName), fallback to abbr; case-insensitive
const teamKey = (id) => {
  const m = teamsMeta[id] || {};
  const full = [m.cityName, m.displayName].filter(Boolean).join(" ").trim();
  return (full || m.abbrName || "").toLowerCase();
};

const entries = Object.entries(coaches).sort((a, b) =>
  teamKey(a[0]).localeCompare(teamKey(b[0]), undefined, { sensitivity: "base" })
);


  for (const [teamId, c] of entries) {
    const meta = teamsMeta[teamId] || {};
    const teamName = [meta.cityName, meta.displayName].filter(Boolean).join(" ") || "Unknown Team";
    const logo = meta.logoId ? `images/logos/${meta.logoId}.png` : "images/logos/default.png";

    // Link to team page (use '/teams?teamId=' if you've enabled cleanUrls)
    const teamLink = `teams.html?teamId=${teamId}`;

    const tr = document.createElement("tr");

    tr.appendChild(td(`${c.coachName || ""}`));

    tr.appendChild(td(`
      <a class="team-link" href="${teamLink}">
        <span class="team-cell">
          <img class="team-logo" src="${logo}" alt="${meta.abbrName || "Team"} logo">
          ${teamName}
        </span>
      </a>
    `));

    tr.appendChild(td(`${c.psn || ""}`));

    // Broadcast: plain text if no URL, clickable if URL present
    const platform = (c.broadcast?.platform || "").trim();
    const url = (c.broadcast?.url || "").trim();
    let broadcastCell = "";
    if (platform) {
      broadcastCell = url ? `<a href="${url}" target="_blank" rel="noopener">${platform}</a>` : platform;
    } else {
      broadcastCell = "—";
    }
    tr.appendChild(td(broadcastCell));

    tr.appendChild(td(`${c.timezone || ""}`));

    tbody.appendChild(tr);
  }

  if (!entries.length) {
    const tr = document.createElement("tr");
    const el = document.createElement("td");
    el.colSpan = 5;
    el.style.opacity = ".8";
    el.textContent = "No coaches configured yet. Add them in the Admin page.";
    tr.appendChild(el);
    tbody.appendChild(tr);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const [teamsMeta, coaches] = await Promise.all([loadTeamsMeta(), loadCoaches()]);
    render(coaches, teamsMeta);
  } catch (e) {
    console.error("Failed to load coaches:", e);
  }
});
