// scripts/tradeCalculator.js
// Formula: Player Value = Base(OVR_online) * (1 + (pos + age + years + cap + dev))
// Negatives allowed. No global scale.

import { db } from "./firebaseConfig.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const CFG_PATH = "config/tradeCalc";

// ONLINE defaults. If DB has values, we use those; otherwise these apply.
const DEFAULTS = {
  positions: {
    "QB": 1.35, "HB": 0.075, "FB": -0.65, "WR": 0.25, "TE": 0.21,
    "LT": 0.275, "LG": 0.1, "C": 0.13, "RG": 0.1, "RT": 0.25,
    "LEDGE": 0.27, "DT": 0.22, "REDGE": 0.27, "WILL": 0.27, "MIKE": 0.29,
    "SAM": 0.26, "CB": 0.35, "SS": 0.08, "FS": 0.09, "K": -0.85, "P": -0.95
  },
  ages: { "20":0.042,"21":0.037,"22":0.033,"23":0.024,"24":0.015,"25":0.006,"26":0.003,"27":0.002,"28":0.001,"29":0,"30":-0.001,"31":-0.0025,"32":-0.005,"33":-0.007,"34":-0.008,"35":-0.01,"36":-0.0125,"37":-0.015,"38":-0.016,"39":-0.01625,"40":-0.0168 },
  years_left: { "7":0.35,"6":0.3,"5":0.25,"4":0.2,"3":0.15,"2":0,"1":-0.1,"0":-0.2 },
  cap_hit: { ">$15m":-0.1,"$10m - $15m":-0.05,"$7m - $10m":0,"$4m - $7m":0.15,"$2m - $4m":0.2,"$1m - $2m":0.275,"<$1m":0.3 },
  dev_trait: { "X-Factor":0.6,"Superstar":0.3,"Star":0.05,"Normal":-0.2 },

  // ONLINE OVR -> Base
  overall: {
    "67":70,"68":75,"69":80,"70":90,"71":100,"72":110,"73":120,"74":130,"75":145,"76":155,"77":165,"78":180,"79":190,
    "80":205,"81":225,"82":245,"83":270,"84":300,"85":335,"86":375,"87":420,"88":460,"89":520,"90":550,"91":600,"92":700,
    "93":850,"94":975,"95":1100,"96":1250,"97":1500,"98":1700,"99":1875
  },

draft_pick: {
  "1":3000,"2":2600,"3":2200,"4":1800,"5":1700,"6":1600,"7":1500,"8":1400,"9":1350,"10":1300,
  "11":1250,"12":1200,"13":1150,"14":1100,"15":1050,"16":1000,"17":950,"18":900,"19":875,"20":850,
  "21":800,"22":780,"23":760,"24":740,"25":720,"26":700,"27":680,"28":660,"29":640,"30":620,"31":600,"32":590,
  "33":580,"34":560,"35":550,"36":540,"37":530,"38":520,"39":510,"40":500,"41":490,"42":480,"43":470,"44":460,"45":450,
  "46":440,"47":430,"48":420,"49":410,"50":400,"51":390,"52":380,"53":370,"54":360,"55":350,"56":340,"57":330,"58":320,"59":310,"60":300,
  "61":292,"62":294,"63":276,"64":270,"65":265,"66":260,"67":255,"68":250,"69":245,"70":240,"71":235,"72":230,"73":225,"74":220,"75":215,"76":210,
  "77":205,"78":200,"79":195,"80":190,"81":185,"82":180,"83":175,"84":170,"85":165,"86":160,"87":155,"88":150,"89":145,"90":140,"91":136,"92":132,
  "93":128,"94":124,"95":120,"96":116,"97":112,"98":108,"99":104,"100":100,"101":96,"102":92,"103":88,"104":86,"105":84,"106":82,"107":80,"108":78,
  "109":76,"110":74,"111":72,"112":70,"113":68,"114":66,"115":64,"116":62,"117":60,"118":58,"119":56,"120":54,"121":52,"122":50,"123":49,"124":48,
  "125":47,"126":46,"127":45,"128":44,"129":43,"130":42,"131":41,"132":40,"133":39.5,"134":39,"135":38.5,"136":38,"137":37.5,"138":37,"139":36.5,"140":36,
  "141":35.5,"142":35,"143":34.5,"144":34,"145":33.5,"146":33,"147":32.6,"148":32.2,"149":31.8,"150":31.4,"151":31,"152":30.6,"153":30.2,"154":29.8,"155":29.4,"156":29,
  "157":28.6,"158":28.2,"159":27.8,"160":27.4,"161":27,"162":26.6,"163":26.2,"164":25.8,"165":25.4,"166":25,"167":24.6,"168":24.2,"169":23.8,"170":23.4,"171":23,"172":22.6,
  "173":22.2,"174":21.8,"175":21.4,"176":21,"177":20.6,"178":20.2,"179":19.8,"180":19.4,"181":19,"182":18.2,"183":18,"184":17.8,"185":17.4,"186":17,"187":16.6,"188":16.2,
  "189":15.8,"190":15.4,"191":15,"192":14.6,"193":14.2,"194":13.8,"195":13.4,"196":13,"197":12.6,"198":12.2,"199":11.8,"200":11.4,"201":11,"202":10.6,"203":10.2,"204":9.8,
  "205":9.4,"206":9,"207":8.6,"208":8.2,"209":7.8,"210":7.4,"211":7,"212":6.6,"213":6.2,"214":5.8,"215":5.4,"216":5,"217":4.6,"218":4.2,"219":3.8,"220":3.4,
  "221":3,"222":2.6,"223":2.2,"224":1.8,"225":1.5,"226":1.3,"227":1,"228":1,"229":1,"230":1,"231":1,"232":1,"233":1,"234":1,"235":1,"236":1,
  "237":1,"238":1,"239":1,"240":1,"241":1,"242":1,"243":1,"244":1,"245":1,"246":1,"247":1,"248":1,"249":1,"250":1,"251":1,"252":1,
  "253":1,"254":1,"255":1,"256":1
}
};

let CFG = DEFAULTS;

async function loadConfig() {
  try {
    const snap = await get(ref(db, CFG_PATH));
    if (snap.exists()) {
      const s = snap.val();
      CFG = {
        positions: s.positions || DEFAULTS.positions,
        ages: s.ages || DEFAULTS.ages,
        years_left: s.years_left || DEFAULTS.years_left,
        cap_hit: s.cap_hit || DEFAULTS.cap_hit,
        dev_trait: s.dev_trait || DEFAULTS.dev_trait,
        overall: s.overall || DEFAULTS.overall,
        draft_pick: s.draft_pick || DEFAULTS.draft_pick
      };
    }
  } catch (e) {
    console.warn("Trade calc config load failed; using defaults.", e);
    CFG = DEFAULTS;
  }
}

const MAX_ASSETS = 6;

function assetCount(side) {
  const wrap = document.querySelector(`#side${side} .assets`);
  return wrap ? wrap.querySelectorAll(".asset").length : 0;
}

function updateAssetButtons(side) {
  const count = assetCount(side);
  const disabled = count >= MAX_ASSETS;
  document
    .querySelectorAll(`#side${side} [data-add-player], #side${side} [data-add-pick]`)
    .forEach(btn => {
      btn.disabled = disabled;
      btn.classList.toggle("disabled", disabled);
      btn.title = disabled
        ? "Max 6 assets reached"
        : (btn.hasAttribute("data-add-player") ? "Add Player" : "Add Pick");
    });
}

function mkEl(html) { const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstElementChild; }

function renderPlayerAsset(side, cfg) {
  const posOptions = Object.keys(cfg.positions).map(p => `<option value="${p}">${p}</option>`).join("");
  const devOptions = Object.keys(cfg.dev_trait).map(d => `<option value="${d}">${d}</option>`).join("");
  const capOptions = Object.keys(cfg.cap_hit).map(c => `<option value="${c}">${c}</option>`).join("");

  return mkEl(`
    <div class="asset" data-type="player" data-side="${side}">
      <div class="row">
        <select class="pos"><option value="">POS</option>${posOptions}</select>
        <input type="number" class="ovr" placeholder="OVR" min="60" max="99">
      </div>
      <div class="row">
        <select class="dev"><option value="">Dev Trait</option>${devOptions}</select>
        <input type="number" class="age" placeholder="Age" min="18" max="45">
      </div>
      <div class="row">
        <input type="number" class="years" placeholder="Years Left" min="0" max="7">
        <select class="cap"><option value="">Cap Hit</option>${capOptions}</select>
      </div>
      <div class="asset-controls">
        <button class="btn" data-remove>Remove</button>
      </div>
    </div>
  `);
}

function renderPickAsset(side) {
  return mkEl(`
    <div class="asset" data-type="pick" data-side="${side}">
      <div class="row">
        <label class="inline">Type</label>
        <select class="pick-type">
          <option value="current" selected>Current</option>
          <option value="future">Future</option>
        </select>

        <label class="inline">Round</label>
        <input type="number" class="pick-round" placeholder="1-7" min="1" max="7" value="1">

        <label class="inline">Pick</label>
        <input type="number" class="pick-slot" placeholder="1-32" min="1" max="32" value="1">
      </div>

      <div class="row">
        <small>Computed Total Pick #: <span class="computed-pickno">1</span></small>
      </div>

      <div class="asset-controls">
        <button class="btn" data-remove>Remove</button>
      </div>
    </div>
  `);
}


function baseFromOVR(cfg, ovr) {
  const k = String(ovr);
  if (cfg.overall[k] != null) return Number(cfg.overall[k]);
  for (let v = ovr; v >= 60; v--) {
    const key = String(v);
    if (cfg.overall[key] != null) return Number(cfg.overall[key]);
  }
  return 0;
}

// Treat age values saved as FRACTIONS (0.024) or as PERCENT POINTS (2.4) — both work.
function normalizeAgeForFormula(ageRaw) {
  let n = Number(ageRaw || 0);
  if (!isFinite(n)) return 0;
  // If it's a small fraction (|n| < 1), the sheet expects percent points -> convert (0.024 -> 2.4)
  if (Math.abs(n) < 1) n = n * 100;
  return n;
}

// Player Value = Base(OVR_online) * (1 + (pos + age + years + cap + dev))
// Negatives allowed. No global scale.
// Rule: clamp OVR to >= 67 and Age to <= 40 (independently).
function computePlayerValue(p, cfg) {
  const inputOvr = Number(p.ovr);
  const inputAge = Number(p.age);

  // Independent clamps
  const effOvr = isFinite(inputOvr) ? Math.max(67, inputOvr) : 67;
  const effAge = isFinite(inputAge) ? Math.min(40, inputAge) : 40;

  // base from (possibly clamped) OVR
  const base = baseFromOVR(cfg, effOvr);

  // other multipliers use the user's selections as-is
  const pos   = Number(cfg.positions[p.position] ?? 0);
  const dev   = Number(cfg.dev_trait[p.devTrait] ?? 0);
  const years = Number(cfg.years_left[String(p.yearsLeft)] ?? 0);
  const cap   = Number(cfg.cap_hit[p.capHit] ?? 0);

  // age curve uses the (possibly clamped) age
  const ageRaw = cfg.ages[String(effAge)];
  const age    = normalizeAgeForFormula(ageRaw); // supports fraction or percent points

  const sum = pos + dev + age + years + cap;
  const raw = base * (1 + sum);

  return Math.round(raw * 10) / 10; // keep one decimal like the sheet
}



function computeTotalPickNo(roundNum, pickNum) {
  // Guard + bounds
  if (!Number.isFinite(roundNum) || !Number.isFinite(pickNum)) return 0;
  if (roundNum < 1 || roundNum > 7 || pickNum < 1 || pickNum > 32) return 0;

  // Standard indexing: 1..32, 33..64, ...
  return (roundNum - 1) * 32 + pickNum;
}


function updateComputedPickLabel(assetEl) {
  const r = Number(assetEl.querySelector(".pick-round")?.value || 0);
  const p = Number(assetEl.querySelector(".pick-slot")?.value || 0);
  const total = (r >= 1 && p >= 1) ? computeTotalPickNo(r, p) : 0;
  const label = assetEl.querySelector(".computed-pickno");
  if (label) label.textContent = total || "--";
}

function computePickValue(pk, cfg) {
  if (!pk.pickNo) return 0;
  const key = String(pk.pickNo);
  const base = cfg.draft_pick?.[key];
  if (base == null) return 0;
  // Future picks are worth half
  return Number(pk.isFuture ? base * 0.5 : base);
}

function readAssets(section) {
  return Array.from(section.querySelectorAll(".asset")).map(n => {
    const type = n.dataset.type;
     if (type === "player") {
    return {
      type,
      position: n.querySelector(".pos")?.value || "",
      ovr: Number(n.querySelector(".ovr")?.value || 0),
      devTrait: n.querySelector(".dev")?.value || "Normal",
      age: Number(n.querySelector(".age")?.value || 0),
      yearsLeft: Number(n.querySelector(".years")?.value || 0),
      capHit: n.querySelector(".cap")?.value || "$7m - $10m"
    };
  } else {
    // PICK
    const isFuture = (n.querySelector(".pick-type")?.value || "current") === "future";
    const roundNum = Number(n.querySelector(".pick-round")?.value || 0);
    const pickNum  = Number(n.querySelector(".pick-slot")?.value || 0);
    const pickNo   = (roundNum >= 1 && pickNum >= 1) ? computeTotalPickNo(roundNum, pickNum) : 0;

    return { type, isFuture, roundNum, pickNum, pickNo };
  }
  });
}

function sumValue(assets, cfg) {
  return assets.reduce((acc, a) => acc + (a.type === "player" ? computePlayerValue(a, cfg) : computePickValue(a, cfg)), 0);
}

function nearestPickSuggestion(diffAbs, cfg) {
  const list = Object.entries(cfg.draft_pick || {}).map(([k, v]) => ({ pick: Number(k), val: Number(v) }));
  if (!list.length) return null;
  list.sort((a, b) => Math.abs(a.val - diffAbs) - Math.abs(b.val - diffAbs));
  const best = list[0];
  return best ? `≈ Pick #${best.pick} (${best.val})` : null;
}

function addPlayer(side) {
  if (assetCount(side) >= MAX_ASSETS) { updateAssetButtons(side); return; }
  const sectionEl = document.querySelector(`#side${side} .assets`);
  if (!sectionEl) return;
  const node = renderPlayerAsset(side, CFG);
  sectionEl.appendChild(node);
  updateAssetButtons(side);
}

function addPick(side) {
  if (assetCount(side) >= MAX_ASSETS) { updateAssetButtons(side); return; }
  const sectionEl = document.querySelector(`#side${side} .assets`);
  if (!sectionEl) return;
  const node = renderPickAsset(side);
  sectionEl.appendChild(node);
  // if you added the computed label helper earlier:
  if (typeof updateComputedPickLabel === "function") updateComputedPickLabel(node);
  updateAssetButtons(side);
}

function calculate() {
  const sideA = document.querySelector("#sideA .assets");
  const sideB = document.querySelector("#sideB .assets");
  if (!sideA || !sideB) return;

  const aAssets = readAssets(sideA);
  const bAssets = readAssets(sideB);
  const totalA = sumValue(aAssets, CFG);
  const totalB = sumValue(bAssets, CFG);

  const totalAEl = document.getElementById("totalA");
  const totalBEl = document.getElementById("totalB");
  if (totalAEl) totalAEl.textContent = String(totalA);
  if (totalBEl) totalBEl.textContent = String(totalB);

  const diff = totalA - totalB;
  const abs = Math.abs(diff);
  const box = document.getElementById("resultBox");
  if (!box) return;

  if (diff === 0) {
    box.className = "result good";
    box.textContent = "Perfectly balanced — no additional compensation needed.";
  } else if (diff > 0) {
    const hint = nearestPickSuggestion(abs, CFG);
    box.className = "result bad";
    box.textContent = `Team A ahead by ${abs}. Consider adding value to Team B${hint ? ` (e.g., ${hint})` : ""}.`;
  } else {
    const hint = nearestPickSuggestion(abs, CFG);
    box.className = "result bad";
    box.textContent = `Team B ahead by ${abs}. Consider adding value to Team A${hint ? ` (e.g., ${hint})` : ""}.`;
  }
}

// ---------- ROBUST WIRING ----------
function sideFromBtn(btn) {
  const attr = btn?.getAttribute?.("data-add-player") || btn?.getAttribute?.("data-add-pick");
  if (attr === "A" || attr === "B") return attr;
  const sec = btn?.closest?.("section[id^='side']");
  if (!sec) return null;
  if (sec.id.toLowerCase().includes("sidea")) return "A";
  if (sec.id.toLowerCase().includes("sideb")) return "B";
  return null;
}

function globalClickHandler(e) {
  try {
    const addPlayerBtn = e.target.closest?.("[data-add-player]");
    if (addPlayerBtn) { e.preventDefault(); e.stopPropagation(); const side = sideFromBtn(addPlayerBtn); if (side) addPlayer(side); return; }
    const addPickBtn = e.target.closest?.("[data-add-pick]");
    if (addPickBtn) { e.preventDefault(); e.stopPropagation(); const side = sideFromBtn(addPickBtn); if (side) addPick(side); return; }
const removeBtn = e.target.closest?.("[data-remove]");
if (removeBtn) {
  e.preventDefault();
  e.stopPropagation();
  const asset = removeBtn.closest(".asset");
  const side = asset?.dataset.side || (asset?.closest("#sideB") ? "B" : "A");
  asset?.remove();
  if (side === "A" || side === "B") updateAssetButtons(side);
  return;
}
    if (e.target.id === "calcBtn") { e.preventDefault(); calculate(); return; }
    if (e.target.id === "clearBtn") {
      e.preventDefault();
      const a = document.querySelector("#sideA .assets");
      const b = document.querySelector("#sideB .assets");
      if (a) a.innerHTML = "";
      if (b) b.innerHTML = "";
      const totalA = document.getElementById("totalA");
      const totalB = document.getElementById("totalB");
      if (totalA) totalA.textContent = "0";
      if (totalB) totalB.textContent = "0";
      const box = document.getElementById("resultBox");
      if (box) { box.className = "result hint"; box.textContent = "Add assets and click Calculate to see balance & suggestions."; }
        updateAssetButtons("A");
  updateAssetButtons("B");
      return;
    }
  } catch (err) {
    console.error("[tradeCalc] Click handler error:", err);
  }
}

// Attach delegation immediately
if (!window.__tradeCalcWired) {
  document.addEventListener("click", globalClickHandler);
  window.__tradeCalcWired = true;
}

// Recompute total pick # when round/pick/type changes
document.addEventListener("input", (e) => {
  const asset = e.target.closest?.(".asset[data-type='pick']");
  if (!asset) return;
  if (e.target.matches(".pick-round, .pick-slot, .pick-type")) {
    updateComputedPickLabel(asset);
  }
});
document.addEventListener("change", (e) => {
  const asset = e.target.closest?.(".asset[data-type='pick']");
  if (!asset) return;
  if (e.target.matches(".pick-round, .pick-slot, .pick-type")) {
    updateComputedPickLabel(asset);
  }
});

// Also wire direct listeners once DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-add-player]").forEach(btn => {
    btn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); const side = sideFromBtn(btn); if (side) addPlayer(side); });
  });
  document.querySelectorAll("[data-add-pick]").forEach(btn => {
    btn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); const side = sideFromBtn(btn); if (side) addPick(side); });
  });
  const calcBtn = document.getElementById("calcBtn");
  if (calcBtn) calcBtn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); calculate(); });
  const clearBtn = document.getElementById("clearBtn");
  if (clearBtn) clearBtn.addEventListener("click", (e) => {
    e.preventDefault(); e.stopPropagation();
    const a = document.querySelector("#sideA .assets");
    const b = document.querySelector("#sideB .assets");
    if (a) a.innerHTML = "";
    if (b) b.innerHTML = "";
    const totalA = document.getElementById("totalA");
    const totalB = document.getElementById("totalB");
    if (totalA) totalA.textContent = "0";
    if (totalB) totalB.textContent = "0";
    const box = document.getElementById("resultBox");
    if (box) { box.className = "result hint"; box.textContent = "Add assets and click Calculate to see balance & suggestions."; }
      updateAssetButtons("A");
  updateAssetButtons("B");
  });
});

// Load config after DOM ready (not required for buttons to work)
document.addEventListener("DOMContentLoaded", loadConfig);
  updateAssetButtons("A");
  updateAssetButtons("B");
