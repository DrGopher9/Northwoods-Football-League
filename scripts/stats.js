// scripts/stats.js
import { db } from "./firebaseConfig.js";
import { ref, get, set, child } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { TEAM_OPTIONS } from "./statsConstants.js";


// === NEW: root for manual stats ===
// All leaderboards now live at: config/leaderboards/{season}/{kind}/{metric}
const STATS_ROOT = "config/leaderboards";

const auth = getAuth();
const seasonSelect = document.getElementById("seasonSelect");
const saveAllBtn = document.getElementById("saveAllBtn");
const editPanel = document.getElementById("editPanel");
const rootMain = document.querySelector("main");

/** Schema
 * We store/read leaderboards under:
 *   config/leaderboards/{season}/{kind}/{metricKey} = [ {name, user, value, id} ... up to 5 ]
 * kind ∈ { team, player }
 */
const TEAM_OFFENSE = [
  { key: "pointsPerGame", label: "Points Per Game" },
  { key: "totalOffense", label: "Total Offense" },
  { key: "passYds", label: "Passing Yards" },
  { key: "rushYds", label: "Rushing Yards" },
  { key: "passTD", label: "Passing TDs" },
  { key: "rushTD", label: "Rushing TDs" },
  { key: "thirdDownPct", label: "3rd Down Conv %" },
  { key: "fourthDownPct", label: "4th Down Conv %" },
  { key: "giveaways", label: "Giveaways" },
  { key: "intThrown", label: "Interceptions Thrown" },
  { key: "fumblesLost", label: "Fumbles Lost" },
  { key: "redzonePointsPct", label: "Redzone Points %" },
];

const TEAM_DEFENSE = [
  { key: "pointsAllowedPerGame", label: "Points Allowed Per Game" },
  { key: "totalDefense", label: "Total Defense" },
  { key: "passDef", label: "Passing Defense" },
  { key: "rushDef", label: "Rushing Defense" },
  { key: "takeaways", label: "Takeaways" },
  { key: "defInts", label: "Defensive Interceptions" },
  { key: "fumRec", label: "Fumble Recoveries" },
  { key: "turnoverDiff", label: "Turnover Difference" },
  { key: "sacks", label: "Sacks" },
  { key: "rzTdsAllowed", label: "Redzone TDs Allowed" },
  { key: "rzFgAllowed", label: "Redzone FG Allowed" },
  { key: "rzDefensePct", label: "Redzone Defense %" },
];

const PLAYER_PASSING = [
  { key: "qbRating", label: "QB Rating" },
  { key: "cmp", label: "Completions" },
  { key: "att", label: "Attempts" },
  { key: "cmpPct", label: "Completion %" },
  { key: "passYds", label: "Pass Yards" },
  { key: "passTD", label: "Pass TDs" },
  { key: "int", label: "Interceptions" },
  { key: "longPass", label: "Longest Pass" },
];

const PLAYER_RUSHING = [
  { key: "rushAtt", label: "Carries" },
  { key: "rushYds", label: "Rush Yards" },
  { key: "rushTD", label: "Rush TDs" },
  { key: "ypc40", label: "Yards Per Carry (Min 40 Att)" },
  { key: "fumbles", label: "Fumbles" },
  { key: "yac", label: "Yards After Contact" },
  { key: "runs20", label: "20+ Yard Runs" },
  { key: "longRush", label: "Longest Rush" },
];

const PLAYER_RECEIVING = [
  { key: "rec", label: "Receptions" },
  { key: "recYds", label: "Receiving Yards" },
  { key: "recTD", label: "Receiving TDs" },
  { key: "ypr40", label: "Yards Per Catch (Min 40 Rec)" },
  { key: "yactch", label: "Yards After Catch" },
  { key: "drops", label: "Drops" },
  { key: "longRec", label: "Longest Reception" },
];

const PLAYER_DEFENSE = [
  { key: "tackles", label: "Tackles" },
  { key: "tfl", label: "Tackles For Loss" },
  { key: "sacks", label: "Sacks" },
  { key: "ints", label: "Interceptions" },
  { key: "intYds", label: "Interception Yards" },
  { key: "intLong", label: "Interception Long" },
  { key: "deflections", label: "Pass Deflections" },
  { key: "ff", label: "Forced Fumbles" },
  { key: "fr", label: "Fumble Recoveries" },
  { key: "frYds", label: "Fumble Return Yards" },
  { key: "safeties", label: "Safeties" },
  { key: "td", label: "Touchdowns" },
];

const PLAYER_KICKING = [
  { key: "points", label: "Total Points" },
  { key: "fgm", label: "Field Goals Made" },
  { key: "fga", label: "Field Goals Attempted" },
  { key: "fgPct15", label: "FG% (Min 15 Att)" },
  { key: "fgLong", label: "Field Goal Long" },
  { key: "xpm", label: "Extra Points Made" },
  { key: "xpa", label: "Extra Points Attempted" },
  { key: "pntAtt", label: "Punting Attempts" },
  { key: "pntYds", label: "Punting Yards" },
  { key: "pntsIn20", label: "Punts Inside 20" },
  { key: "pntLong", label: "Punting Long" },
];

const PLAYER_RETURNS = [
  { key: "krAtt", label: "Kick Return Attempts" },
  { key: "krYds", label: "Kick Return Yards" },
  { key: "krAvg10", label: "Kick Return AVG (Min 10 Att)" },
  { key: "krTd", label: "Kick Return TDs" },
  { key: "krLong", label: "Kick Return Long" },
  { key: "prAtt", label: "Punt Return Attempts" },
  { key: "prYds", label: "Punt Return Yards" },
  { key: "prAvg5", label: "Punt Return AVG (Min 5 Att)" },
  { key: "prTd", label: "Punt Return Touchdowns" },
  { key: "prLong", label: "Punt Return Long" },
];

const GROUPS = {
  team: [
    ["team-offense-grid", TEAM_OFFENSE],
    ["team-defense-grid", TEAM_DEFENSE],
  ],
  player: [
    ["player-passing-grid",   PLAYER_PASSING],
    ["player-rushing-grid",   PLAYER_RUSHING],
    ["player-receiving-grid", PLAYER_RECEIVING],
    ["player-defense-grid",   PLAYER_DEFENSE],
    ["player-kicking-grid",   PLAYER_KICKING],
    ["player-returns-grid",   PLAYER_RETURNS],
  ]
};

// === Manual Standings (8 divisions) ===
const DIVISIONS = [
  { key: "afc_north", label: "AFC North", conf: "afc" },
  { key: "afc_south", label: "AFC South", conf: "afc" },
  { key: "afc_east",  label: "AFC East",  conf: "afc" },
  { key: "afc_west",  label: "AFC West",  conf: "afc" },
  { key: "nfc_north", label: "NFC North", conf: "nfc" },
  { key: "nfc_south", label: "NFC South", conf: "nfc" },
  { key: "nfc_east",  label: "NFC East",  conf: "nfc" },
  { key: "nfc_west",  label: "NFC West",  conf: "nfc" },
];

// === YEARLY AWARDS ===
const AWARDS = [
  { key: "mvp", label: "MVP" },
  { key: "coach", label: "Coach of the Year" },
  { key: "opoy", label: "Offensive Player of the Year" },
  { key: "dpoy", label: "Defensive Player of the Year" },
  { key: "oroy", label: "Offensive Rookie of the Year" },
  { key: "droy", label: "Defensive Rookie of the Year" },
  { key: "top_qb", label: "Top QB" },
  { key: "top_rb", label: "Top RB" },
  { key: "top_wr", label: "Top WR" },
  { key: "top_te", label: "Top TE" },
  { key: "top_edge", label: "Top Edge Rusher" },
  { key: "top_dt", label: "Top DT" },
  { key: "top_lb", label: "Top LB" },
  { key: "top_cb", label: "Top CB" },
  { key: "top_s", label: "Top Safety" },
  { key: "top_k", label: "Top Kicker" },
  { key: "top_p", label: "Top Punter" },
];

// ---------- Tabs ----------
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    document.querySelectorAll("section.tab").forEach(s => {
      const isActive = s.id === `tab-${tab}`;
      s.hidden = !isActive;
      s.classList.toggle("active", isActive);
    });
    renderEditGrid();
  });
});

// ---------- Season Options ----------
async function loadSeasons() {
  // Seasons are keys under config/leaderboards
  const lbRef = ref(db, STATS_ROOT);
  const lbSnap = await get(lbRef);
  const seasons = new Set();
  if (lbSnap.exists()) {
    for (const s of Object.keys(lbSnap.val() || {})) seasons.add(s);
  }
  const arr = Array.from(seasons).sort((a,b)=>Number(a)-Number(b));
  seasonSelect.innerHTML = arr.length
    ? arr.map(s => `<option value="${s}">${s}</option>`).join("")
    : `<option value="">(no seasons)</option>`;
}

// ---------- Rendering ----------

function createTableCard(label, metricKey, kind) {
  const card = document.createElement("div");
  card.className = "stat-card card";
  card.dataset.metric = metricKey;
  card.dataset.kind = kind;
  card.innerHTML = `
    <h3><span>${label}</span><small class="muted"></small></h3>
    <table>
      <thead><tr><th>#</th><th>${kind === "team" ? "Team" : "Player"}</th><th>User</th><th>Value</th></tr></thead>
      <tbody><tr><td colspan="4" class="empty">Loading…</td></tr></tbody>
    </table>
  `;
  return card;
}

function renderAllCards() {
  for (const [containerId, metrics] of GROUPS.team) {
    const grid = document.getElementById(containerId);
    grid.innerHTML = "";
    metrics.forEach(m => grid.appendChild(createTableCard(m.label, m.key, "team")));
  }
  for (const [containerId, metrics] of GROUPS.player) {
    const grid = document.getElementById(containerId);
    grid.innerHTML = "";
    metrics.forEach(m => grid.appendChild(createTableCard(m.label, m.key, "player")));
  }
}

async function loadLeaderboard(kind, metricKey, season) {
  const path = `${STATS_ROOT}/${season}/${kind}/${metricKey}`;
  const snap = await get(ref(db, path));
  const rows = (snap.exists() ? snap.val() : null) || [];
  return Array.isArray(rows) ? rows.slice(0,5) : Object.values(rows).slice(0,5);
}

async function refreshTables() {
  const season = seasonSelect.value;
  const cards = document.querySelectorAll(".stat-card");
  for (const card of cards) {
    const kind = card.dataset.kind;
    const metric = card.dataset.metric;
    const tbody = card.querySelector("tbody");
    tbody.innerHTML = `<tr><td colspan="4" class="empty">Loading…</td></tr>`;
    try {
      const rows = await loadLeaderboard(kind, metric, season);
      if (!rows || !rows.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty">No data</td></tr>`;
        continue;
      }
      tbody.innerHTML = rows.map((r, idx) => `
        <tr>
          <td>${idx+1}</td>
          <td class="stat-name">${logoImg(r.id)}<span>${escapeHtml(r.name || "")}</span></td>
          <td>${escapeHtml(r.user || "")}</td>
          <td>${formatValue(r.value)}</td>
        </tr>
      `).join("");
    } catch (e) {
      console.error(e);
      tbody.innerHTML = `<tr><td colspan="4" class="empty">Error loading</td></tr>`;
    }
  }
}
function createStandingsCard(divLabel, divKey) {
  const card = document.createElement("div");
  card.className = "standings-card card";
  card.dataset.division = divKey;
  card.innerHTML = `
    <h3>${divLabel}</h3>
    <table>
<thead>
  <tr>
    <th>Team</th>
    <th>User</th>
    <th class="num">W</th>
    <th class="num">L</th>
    <th class="num">T</th>
    <th class="num">%</th>
    <th class="num">HOME</th>
    <th class="num">AWAY</th>
    <th class="num">DIV</th>
    <th class="num">CONF</th>
  </tr>
</thead>
      <tbody><tr><td colspan="9" class="empty">Loading…</td></tr></tbody>
    </table>
  `;
  return card;
}

function renderStandingsCards() {
  const afcGrid = document.getElementById("standings-afc-grid");
  const nfcGrid = document.getElementById("standings-nfc-grid");
  if (!afcGrid || !nfcGrid) return;

  afcGrid.innerHTML = "";
  nfcGrid.innerHTML = "";

  DIVISIONS.forEach(d => {
    const card = createStandingsCard(d.label, d.key);
    (d.conf === "afc" ? afcGrid : nfcGrid).appendChild(card);
  });
}

function renderAwards() {
  const grid = document.getElementById("awards-grid");
  if (!grid) return;

  grid.innerHTML = "";

  // Row 1: MVP & Coach
  const row1 = document.createElement("div");
  row1.className = "award-row row-2 row-big";

  // Row 2: Major Awards
  const row2 = document.createElement("div");
  row2.className = "award-row row-4 row-medium";

  // Row 3: Skill Positions
  const row3 = document.createElement("div");
  row3.className = "award-row row-4 row-small";

  // Row 4: Defense Positions
  const row4 = document.createElement("div");
  row4.className = "award-row row-5 row-small";

  // Row 5: Specialists
  const row5 = document.createElement("div");
  row5.className = "award-row row-2 row-small";

  AWARDS.forEach(a => {
    const card = document.createElement("div");
    card.className = "award-card card";
    card.dataset.award = a.key;

    card.innerHTML = `
      <h3>${a.label}</h3>
      <div class="award-content">
        <div class="award-player"></div>
      </div>
    `;

    if (["mvp","coach"].includes(a.key)) row1.appendChild(card);
    else if (["opoy","dpoy","oroy","droy"].includes(a.key)) row2.appendChild(card);
    else if (["top_qb","top_rb","top_wr","top_te"].includes(a.key)) row3.appendChild(card);
    else if (["top_edge","top_dt","top_lb","top_cb","top_s"].includes(a.key)) row4.appendChild(card);
    else if (["top_k","top_p"].includes(a.key)) row5.appendChild(card);
  });

  grid.appendChild(row1);
  grid.appendChild(row2);
  grid.appendChild(row3);
  grid.appendChild(row4);
  grid.appendChild(row5);
}



async function loadDivisionStandings(season, divKey) {
  const path = `${STATS_ROOT}/${season}/standings/${divKey}`;
  const snap = await get(ref(db, path));
  const rows = (snap.exists() ? snap.val() : null) || [];
  // Expecting array of up to 4 teams like:
  // { name, w, l, t, pct, home, away, div, conf, user? }
  return Array.isArray(rows) ? rows : Object.values(rows);
}

async function refreshStandings() {
  const season = seasonSelect.value;
  const cards = document.querySelectorAll(".standings-card");
  for (const card of cards) {
    const divKey = card.dataset.division;
    const tbody = card.querySelector("tbody");
    tbody.innerHTML = `<tr><td colspan="9" class="empty">Loading…</td></tr>`;
    try {
      const rows = await loadDivisionStandings(season, divKey);
      if (!rows || !rows.length) {
        tbody.innerHTML = `<tr><td colspan="9" class="empty">No data</td></tr>`;
        continue;
      }
      tbody.innerHTML = rows.map(r => `
        <tr>
          <td class="stat-name">${logoImg(r.id)}<span>${escapeHtml(r.name || "")}</span></td>
          <td>${escapeHtml(r.user || "")}</td>
          <td class="num">${r.w ?? ""}</td>
          <td class="num">${r.l ?? ""}</td>
          <td class="num">${r.t ?? ""}</td>
          <td class="num">${r.pct ?? ""}</td>
          <td class="num">${escapeHtml(r.home || "")}</td>
          <td class="num">${escapeHtml(r.away || "")}</td>
          <td class="num">${escapeHtml(r.div  || "")}</td>
          <td class="num">${escapeHtml(r.conf || "")}</td>
        </tr>
      `).join("");
    } catch (e) {
      console.error(e);
      tbody.innerHTML = `<tr><td colspan="9" class="empty">Error loading</td></tr>`;
    }
  }
}

// ---------- Awards ----------
async function loadAward(season, awardKey) {
  const path = `${STATS_ROOT}/${season}/awards/${awardKey}`;
  const snap = await get(ref(db, path));
  return snap.exists() ? snap.val() : null;
}

async function refreshAwards() {
  const season = seasonSelect.value;
  const cards = document.querySelectorAll(".award-card");

  for (const card of cards) {
    const awardKey = card.dataset.award;
    const container = card.querySelector(".award-player");

    container.innerHTML = `<div class="empty">Loading…</div>`;

    try {
      const data = await loadAward(season, awardKey);

      if (!data) {
        container.innerHTML = `<div class="empty">No winner selected</div>`;
        continue;
      }

container.innerHTML = `
${data.headshot ? `
  <div class="award-headshot-wrap" style="background:${data.color || '#222'}">
    <img class="award-headshot" src="${data.headshot}" alt="">
  </div>
` : ""}

  
  <div class="award-name">
    ${escapeHtml(data.name || "")}
  </div>

  <div class="award-position">
    ${escapeHtml(data.position || "")}
  </div>

  <div class="award-team">
    ${logoImg(data.id)}
  </div>

  <div class="award-stats">
    ${escapeHtml(data.stats || "")}
  </div>
`;
    } catch (e) {
      console.error(e);
      container.innerHTML = `<div class="empty">Error loading</div>`;
    }
  }
}



function formatValue(v) {
  if (v == null) return "";
  if (typeof v === "number") return v.toLocaleString();
  return String(v);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// ---------- Admin Editing ----------
async function isAdmin(uid) {
  if (!uid) return false;
  const adminsRef = ref(db, `config/admins/${uid}`);
  const snap = await get(adminsRef);
  return !!(snap.exists() && snap.val() === true);
}

function currentTabKind() {
  return document.querySelector(".tab-btn.active").dataset.tab; // 'team' | 'player'
}

function renderEditGrid() {
  const season = seasonSelect.value;
  const tab = document.querySelector(".tab-btn.active").dataset.tab; // 'team'|'player'|'standings'
  const panel = document.getElementById("editGrid");
  if (!panel) return;

  if (tab === "awards") {
  panel.innerHTML = `
    <label class="row-label">Edit Award</label>
    <select id="editAward">
      ${AWARDS.map(a => `<option value="${a.key}">${a.label}</option>`).join("")}
    </select>
    <input id="editSeason" type="number" value="${season}" />
    <span></span><span></span>

<input placeholder="Player Name" id="a_name" />
<input placeholder="Position" id="a_position" />
${teamSelectHtml("a_logo")}
<input placeholder="Headshot URL (direct image link)" id="a_headshot" />
<input placeholder="Team Hex Color (ex: #003594)" id="a_color" />
<input placeholder="Stats (free text)" id="a_stats" />
  `;
  return;
}

  if (tab === "standings") {
    panel.innerHTML = `
      <label class="row-label">Edit Standings — Division</label>
      <select id="editDivision">
        ${DIVISIONS.map(d => `<option value="${d.key}">${d.label}</option>`).join("")}
      </select>
      <input id="editSeason" type="number" value="${season}" />
      <span></span><span></span>

      ${Array.from({length:4}).map((_,i)=>`
        <div class="row-label">Team #${i+1}</div>
        <input placeholder="Team Name" id="s_name_${i}" />
        ${teamSelectHtml(`s_logo_${i}`)}
        <input placeholder="User" id="s_user_${i}" />
        <input placeholder="W" id="s_w_${i}" />
        <input placeholder="L" id="s_l_${i}" />
        <input placeholder="T" id="s_t_${i}" />
        <input placeholder="%" id="s_pct_${i}" />
        <input placeholder="HOME (e.g., 6-2-0)" id="s_home_${i}" />
        <input placeholder="AWAY" id="s_away_${i}" />
        <input placeholder="DIV" id="s_div_${i}" />
        <input placeholder="CONF" id="s_conf_${i}" />
      `).join("")}
    `;
    return;
  }

  // team / player
  const kind = tab; // 'team' | 'player'
  const blocks = GROUPS[kind];
  const allMetrics = blocks.flatMap(([, arr]) => arr);
  panel.innerHTML = `
    <label class="row-label">Edit Top 5 — ${kind.toUpperCase()}</label>
    <select id="editMetric">${allMetrics.map(m => `<option value="${m.key}">${m.label}</option>`).join("")}</select>
    <input id="editSeason" type="number" value="${season}" />
    <span></span><span></span>
    ${Array.from({length:5}).map((_,i)=>`
      <div class="row-label">#${i+1}</div>
      <input placeholder="${kind==='team'?'Team Name':'Player Name'}" id="e_name_${i}"/>
      ${teamSelectHtml(`e_logo_${i}`)}
      <input placeholder="User" id="e_user_${i}"/>
      <input placeholder="Value" id="e_value_${i}" />
    `).join("")}
  `;
}

async function saveCurrentEdit() {
  const tab = document.querySelector(".tab-btn.active").dataset.tab; // 'team'|'player'|'standings'
  const seasonEl = document.getElementById("editSeason");
  const season = seasonEl ? seasonEl.value : "";

  if (tab === "awards") {
  const awardKey = document.getElementById("editAward")?.value;

const data = {
  name: document.getElementById("a_name")?.value?.trim() || "",
  position: document.getElementById("a_position")?.value?.trim() || "",
  id: document.getElementById("a_logo")?.value || "",
  headshot: document.getElementById("a_headshot")?.value?.trim() || "",
  color: document.getElementById("a_color")?.value?.trim() || "",
  stats: document.getElementById("a_stats")?.value?.trim() || ""
};



  await set(ref(db, `${STATS_ROOT}/${season}/awards/${awardKey}`), data);
  await refreshAwards();
  alert("Award saved!");
  return;
}
  
  if (tab === "standings") {
    const divKey = (document.getElementById("editDivision")?.value || "").trim();
    const rows = [];
    for (let i=0;i<4;i++) {
      const get = id => document.getElementById(id)?.value?.trim() ?? "";
      const r = {
        name: get(`s_name_${i}`),
        id:   get(`s_logo_${i}`),
        user: get(`s_user_${i}`),
        w:    parseMaybeNumber(get(`s_w_${i}`)),
        l:    parseMaybeNumber(get(`s_l_${i}`)),
        t:    parseMaybeNumber(get(`s_t_${i}`)),
        pct:  get(`s_pct_${i}`),
        home: get(`s_home_${i}`),
        away: get(`s_away_${i}`),
        div:  get(`s_div_${i}`),
        conf: get(`s_conf_${i}`),
      };
      // skip completely empty rows
      if (Object.values(r).every(v => v === "")) continue;
      rows.push(r);
    }
    await set(ref(db, `${STATS_ROOT}/${season}/standings/${divKey}`), rows);
    await refreshStandings();
    alert("Standings saved!");
    return;
  }

  // team / player
  const kind = tab; // 'team'|'player'
  const metric = (document.getElementById("editMetric")?.value || "").trim();
  const rows = [];
  for (let i=0;i<5;i++) {
    const get = id => document.getElementById(id)?.value?.trim() ?? "";
    const name  = get(`e_name_${i}`);
    const user  = get(`e_user_${i}`);
    const value = get(`e_value_${i}`);
    const idVal = get(`e_logo_${i}`); // logo dropdown
    if (!name && !user && !value) continue;
    rows.push({ name, user, value: parseMaybeNumber(value), id: idVal });
  }
  await set(ref(db, `${STATS_ROOT}/${season}/${kind}/${metric}`), rows);
  await refreshTables();
  alert("Saved!");
}

function parseMaybeNumber(s) {
  if (s === "") return "";
  const n = Number(s.replace(/,/g,''));
  return Number.isFinite(n) ? n : s;
}

function logoImg(id) {
  if (id === undefined || id === null || id === "") return "";
  return `<img class="logo" src="images/logos/${id}.png" alt="">`;
}
function teamSelectHtml(domId, selectedId = "") {
  const opts = TEAM_OPTIONS.map(o =>
    `<option value="${o.id}" ${String(selectedId)===String(o.id)?"selected":""}>${o.abbr}</option>`
  ).join("");
  return `<select id="${domId}"><option value="">—</option>${opts}</select>`;
}


// ---------- Wire up ----------
const addSeasonBtn = document.getElementById('addSeasonBtn');
const newSeasonInput = document.getElementById('newSeasonInput');
if (addSeasonBtn) {
  addSeasonBtn.addEventListener('click', async () => {
    const val = (newSeasonInput?.value || '').trim();
    if (val === '') { alert('Enter a season number (e.g., 0, 1, 2)'); return; }
    // create empty node to make the season appear
    const path = `${STATS_ROOT}/${val}`;
    await set(ref(db, path), { created: Date.now() });
    await loadSeasons();
    seasonSelect.value = val;
    renderEditGrid();
    await refreshTables();
  });
}

seasonSelect.addEventListener("change", () => {
  renderEditGrid();
  refreshTables();
  refreshStandings(); // NEW
  refreshAwards();
});

saveAllBtn?.addEventListener("click", saveCurrentEdit);

// Auth gate for editor
onAuthStateChanged(auth, async (user) => {
  try {
    const admin = await isAdmin(user?.uid);
    rootMain.classList.toggle("edit-visible", !!admin);
    editPanel.style.display = admin ? "block" : "none";
    if (admin) renderEditGrid();
  } catch (e) { console.error(e); }
});

// Initial render with Loader Logic
(async function init() {
  const loader = document.getElementById("global-loader");
  const content = document.getElementById("main-content");

  try {
    renderAllCards();
    renderStandingsCards();     
    renderAwards();
    await loadSeasons();
    await refreshTables();
    await refreshStandings();   
    await refreshAwards();
    
    // Hide loader and show content
    loader.style.display = "none";
    content.style.display = "block";
  } catch (e) {
    console.error("Error loading stats data:", e);
    loader.innerHTML = `<div style="color: #f44336;">Error loading stats data. Check console.</div>`;
  }
})();

