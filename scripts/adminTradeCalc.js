// scripts/adminTradeCalc.js
// Admin editor for the trade calc tables (ONLINE values). No overall_scale here.

import { db } from "./firebaseConfig.js";
import { ref, get, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const CFG_PATH = "config/tradeCalc";

const $ = (sel) => document.querySelector(sel);
function mk(html){ const d=document.createElement("div"); d.innerHTML=html.trim(); return d.firstElementChild; }

// Defaults (ONLINE)
const DEFAULTS = {
  positions: { "QB":1.35,"HB":0.075,"FB":-0.65,"WR":0.25,"TE":0.21,"LT":0.275,"LG":0.1,"C":0.13,"RG":0.1,"RT":0.25,"LEDGE":0.27,"DT":0.22,"REDGE":0.27,"WILL":0.27,"MIKE":0.29,"SAM":0.26,"CB":0.35,"SS":0.08,"FS":0.09,"K":-0.85,"P":-0.95 },
  dev_trait: { "X-Factor":0.6,"Superstar":0.3,"Star":0.05,"Normal":-0.2 },
  ages: { "20":0.042,"21":0.037,"22":0.033,"23":0.024,"24":0.015,"25":0.006,"26":0.003,"27":0.002,"28":0.001,"29":0,"30":-0.001,"31":-0.0025,"32":-0.005,"33":-0.007,"34":-0.008,"35":-0.01,"36":-0.0125,"37":-0.015,"38":-0.016,"39":-0.01625,"40":-0.0168 },
  years_left: { "7":0.35,"6":0.3,"5":0.25,"4":0.2,"3":0.15,"2":0,"1":-0.1,"0":-0.2 },
  cap_hit: { ">$15m":-0.1,"$10m - $15m":-0.05,"$7m - $10m":0,"$4m - $7m":0.15,"$2m - $4m":0.2,"$1m - $2m":0.275,"<$1m":0.3 },
  overall: {
    "67":70,"68":75,"69":80,"70":90,"71":100,"72":110,"73":120,"74":130,"75":145,"76":155,"77":165,"78":180,"79":190,
    "80":205,"81":225,"82":245,"83":270,"84":300,"85":335,"86":375,"87":420,"88":460,"89":520,"90":550,"91":600,"92":700,
    "93":850,"94":975,"95":1100,"96":1250,"97":1500,"98":1700,"99":1875
  },
  draft_pick: {} // You can paste the ONLINE pick chart here via the UI (below)
};

let cfg = null;

async function load() {
  const snap = await get(ref(db, CFG_PATH));
  cfg = snap.exists() ? snap.val() : structuredClone(DEFAULTS);
  for (const k of Object.keys(DEFAULTS)) cfg[k] = cfg[k] ?? structuredClone(DEFAULTS[k]);
  render();
}

function renderMap(listEl, obj, keyPlaceholder, valPlaceholder, valStep="0.01") {
  listEl.innerHTML = "";
  Object.entries(obj).forEach(([k,v]) => {
    const row = mk(`<div class="pair"><input type="text" value="${k}" placeholder="${keyPlaceholder}"><input type="number" step="${valStep}" value="${v}" placeholder="${valPlaceholder}"><button class="btn" data-del>Remove</button></div>`);
    row.querySelector("[data-del]").addEventListener("click", () => row.remove());
    listEl.appendChild(row);
  });
}

function collectMap(listEl, keyToNumber=false) {
  const out = {};
  listEl.querySelectorAll(".pair").forEach(p => {
    const k = p.children[0].value.trim();
    const v = Number(p.children[1].value);
    if (!k) return;
    out[keyToNumber ? String(Number(k)) : k] = v;
  });
  return out;
}

function render() {
  renderMap($("#posList"), cfg.positions, "Position", "Multiplier");
  renderMap($("#devList"), cfg.dev_trait, "Dev", "Multiplier");
  // Age input expects PERCENT numbers like 4.2; we store FRACTION (0.042)
  const agesPretty = Object.fromEntries(Object.entries(cfg.ages).map(([k,frac]) => [k, Math.round(frac*100000)/1000 ]));
  renderMap($("#ageList"), agesPretty, "Age", "Percent", "0.001");
  renderMap($("#yearsList"), cfg.years_left, "Years", "Multiplier");
  renderMap($("#capList"), cfg.cap_hit, "Bracket", "Multiplier");
  renderMap($("#ovrList"), cfg.overall, "OVR", "Base Value", "1");
  renderMap($("#pickList"), cfg.draft_pick, "Pick #", "Value", "1");
}

function wire() {
  $("#addPos").addEventListener("click", () => { $("#posList").appendChild(mk(`<div class="pair"><input type="text" placeholder="Position"><input type="number" step="0.01" value="0"><button class="btn" data-del>Remove</button></div>`)); });
  $("#addDev").addEventListener("click", () => { $("#devList").appendChild(mk(`<div class="pair"><input type="text" placeholder="Dev"><input type="number" step="0.01" value="0"><button class="btn" data-del>Remove</button></div>`)); });
  $("#addAge").addEventListener("click", () => { $("#ageList").appendChild(mk(`<div class="pair"><input type="text" placeholder="Age"><input type="number" step="0.001" value="0"><button class="btn" data-del>Remove</button></div>`)); });
  $("#addYears").addEventListener("click", () => { $("#yearsList").appendChild(mk(`<div class="pair"><input type="text" placeholder="Years"><input type="number" step="0.01" value="0"><button class="btn" data-del>Remove</button></div>`)); });
  $("#addCap").addEventListener("click", () => { $("#capList").appendChild(mk(`<div class="pair"><input type="text" placeholder="Bracket"><input type="number" step="0.01" value="0"><button class="btn" data-del>Remove</button></div>`)); });
  $("#addOVR").addEventListener("click", () => { $("#ovrList").appendChild(mk(`<div class="pair"><input type="text" placeholder="OVR"><input type="number" step="1" value="0"><button class="btn" data-del>Remove</button></div>`)); });
  $("#addPick").addEventListener("click", () => { $("#pickList").appendChild(mk(`<div class="pair"><input type="text" placeholder="Pick #"><input type="number" step="1" value="0"><button class="btn" data-del>Remove</button></div>`)); });

  $("#saveBtn").addEventListener("click", async () => {
    const positions = collectMap($("#posList"));
    const dev_trait = collectMap($("#devList"));
    const agesPercent = collectMap($("#ageList"), true);
    const ages = Object.fromEntries(Object.entries(agesPercent).map(([k,p]) => [k, Number(p)/100]));
    const years_left = collectMap($("#yearsList"), true);
    const cap_hit = collectMap($("#capList"));
    const overall = collectMap($("#ovrList"), true);
    const draft_pick = collectMap($("#pickList"), true);

    await set(ref(db, CFG_PATH), { positions, dev_trait, ages, years_left, cap_hit, overall, draft_pick });
    alert("Saved!");
  });

  $("#reloadBtn").addEventListener("click", load);
}

load().then(wire).catch(console.error);
