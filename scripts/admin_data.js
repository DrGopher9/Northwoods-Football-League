// scripts/admin_data.js (snippet)
import { getSourceMode, setSourceMode, getRoots, onSourceModeChange, readJSON, writeReplace, writeMerge } from "./dataSource.js";

const modeSel = document.getElementById("sourceModeSelect");
if (modeSel) {
  // initialize dropdown
  getSourceMode().then(m => { modeSel.value = m; }).catch(()=>{});
  // react to changes
  modeSel.addEventListener("change", async () => {
    await setSourceMode(modeSel.value);
    // optional: reload your tree/editor here to reflect new root
    await reloadTree();
  });
  // keep it in sync if another admin changes it
  onSourceModeChange((m) => { if (modeSel.value !== m) modeSel.value = m; });
}

// Example: reloading your tree from the selected root
async function reloadTree() {
  const { mode, rootPath } = await getRoots();
  // your existing code that reads and renders under rootPath
  // e.g. const whole = await readJSON(""); renderTree(whole);
}

// Example: saving edited node
async function saveNode(pathWithinRoot, data, replace = false) {
  if (replace) return writeReplace(pathWithinRoot, data);
  return writeMerge(pathWithinRoot, data);
}
// scripts/admin_data.js  — one-time init (no auto-boot)
let __WIRED = false;
export function initDataAdmin() {
  if (__WIRED) return;
  __WIRED = true;
  boot();           // calls wire() and does the first refresh
}

// scripts/admin_data.js  — Tree + Editor for /xbsx
import { db } from "./firebaseConfig.js";
import { ref, get, set, update, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const ROOT = "data/xbsx";
const $ = (s, el = document) => el.querySelector(s);
const mk = (html) => { const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstElementChild; };

let selectedPath = "";    // e.g., "xbsx/20390713/schedules/reg/1/0"
let selectedSnap = null;  // cache of last loaded value

// ---------- Tree building ----------
async function read(path) {
  const snap = await get(ref(db, path));
  return snap.exists() ? snap.val() : null;
}

function smartSortKeys(obj) {
  const keys = Object.keys(obj ?? {});
  return keys.sort((a, b) => {
    const na = Number(a), nb = Number(b);
    const ia = Number.isFinite(na), ib = Number.isFinite(nb);
    return ia && ib ? na - nb : a.localeCompare(b, undefined, { numeric: true });
  });
}

function isObjectLike(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

// --- DROP-IN REPLACEMENTS ---
// Build the row for a single key under `path`
function nodeRow({ path, key, hasChildren }) {
  const row = mk(`
    <div class="node" data-path="${path}">
      <div class="node-head">
        ${hasChildren
          ? `<button type="button" class="twisty" data-toggle aria-expanded="false">▸</button>`
          : `<span class="dot">•</span>`
        }
        <button type="button" class="key btnlink" data-open>${key}</button>
        <span class="mini path">${path}</span>
      </div>
      ${hasChildren ? `<div class="children" data-parent="${path}" hidden></div>` : ``}
    </div>
  `);

  const toggleBtn = row.querySelector("[data-toggle]");
  const keyBtn    = row.querySelector("[data-open]");
  const holder    = row.querySelector(".children"); // may be null if no kids

  async function open() {
    if (!holder) return;
    if (row.classList.contains("open")) return;          // already open
    row.classList.add("open");
    toggleBtn?.setAttribute("aria-expanded", "true");
    holder.hidden = false;

    // Build exactly once
    if (holder.dataset.loaded !== "1") {
      await buildChildren(holder, path);
      holder.dataset.loaded = "1";
    }
  }

  function close() {
    if (!holder) return;
    row.classList.remove("open");
    toggleBtn?.setAttribute("aria-expanded", "false");
    holder.hidden = true;                                // do not rebuild/remove
  }

  async function onToggle(e) {
    e.preventDefault();
    e.stopPropagation();
    if (row.classList.contains("open")) close();
    else await open();
  }

  toggleBtn?.addEventListener("click", onToggle);
 keyBtn?.addEventListener("click", async (e) => {
  e.preventDefault();
  e.stopPropagation();

  // Load this path into the editor
  if (typeof selectForEdit === "function") {
    await selectForEdit(path);
  } else if (typeof window.__selectNodeForEdit === "function") {
    await window.__selectNodeForEdit(path);
  }

  // Also expand if it has children
  if (holder) await open();
});


  return row;
}

// Fill (or refill) the existing holder for a path.
// NOTE: holder is the ".children" div for that node (created once in nodeRow).
async function buildChildren(holder, path) {
  holder.innerHTML = "";                                 // clean slate
  const val = await read(path);
  if (!isObjectLike(val)) return;

  for (const k of smartSortKeys(val)) {
    const childPath = `${path}/${k}`;
    const childVal  = val[k];
    const hasKids   = isObjectLike(childVal);
    holder.appendChild(nodeRow({ path: childPath, key: k, hasChildren: hasKids }));
  }
}

let CURRENT_PATH = "";
const editorTA = document.getElementById("dataEditor"); // <- your textarea’s id

async function selectForEdit(path) {
  CURRENT_PATH = path;
  const val = await read(path);
  if (editorTA) editorTA.value = JSON.stringify(val ?? null, null, 2);
}
window.selectForEdit = selectForEdit; // optional, makes it callable globally

async function renderTree() {
  const tree = $("#tree");
  tree.innerHTML = "";

  // Root node
  const rootRow = nodeRow({ path: ROOT, key: ROOT, hasChildren: true });
  tree.appendChild(rootRow);
  // Autoload children
  const kids = await buildChildren(tree, ROOT);
  kids.classList.add("open");
  const caret = rootRow.querySelector(".caret");
  if (caret) caret.classList.add("open");
}

// ---------- Editor ----------
function setCrumbs(p) {
  const parts = p.split("/").filter(Boolean);
  $("#crumbs").textContent = parts.map((seg, i) => (i === 0 ? seg : " / " + seg)).join("");
}

async function loadNode(path) {
  selectedPath = path;
  selectedSnap = await get(ref(db, path));
  const exists = selectedSnap.exists();
  const val = exists ? selectedSnap.val() : null;

  setCrumbs(path);
  $("#nodeMeta").textContent = exists ? (isObjectLike(val) ? "Object" : `Value: ${typeof val}`) : "Does not exist (saving will create it)";
  $("#nodeEditor").value = exists ? JSON.stringify(val, null, 2) : "";

  renderContextActions(path, val);
}

function parseEditorJSON() {
  const text = $("#nodeEditor").value.trim();
  if (!text) return null;
  try { return JSON.parse(text); }
  catch (e) { alert("JSON parse error: " + e.message); throw e; }
}

async function saveReplace() {
  const data = parseEditorJSON();
  await set(ref(db, selectedPath), data);
  await refreshAfterWrite();
}

async function saveMerge() {
  const data = parseEditorJSON();
  if (!isObjectLike(data)) {
    // Non-object: merge doesn't make sense — do a replace.
    await set(ref(db, selectedPath), data);
  } else {
    await update(ref(db, selectedPath), data); // shallow merge
  }
  await refreshAfterWrite();
}

async function deleteNode() {
  if (!selectedPath) return;
  if (!confirm(`Delete node at "${selectedPath}"?`)) return;
  await remove(ref(db, selectedPath));
  $("#nodeEditor").value = "";
  $("#nodeMeta").textContent = "Deleted.";
  await renderTree();
}

async function refreshAfterWrite() {
  await loadNode(selectedPath);
  // also keep tree in sync (cheap way: rebuild + keep expanded)
  await renderTree();
}

function renderContextActions(path, val) {
  const box = $("#contextActions");
  box.innerHTML = "";

  const parts = path.split("/").filter(Boolean); // e.g. ["data","xbsx","20390713","schedules","reg","1"]

  // Generic: add child key (object)
  if (isObjectLike(val) || path === ROOT) {
    const addBtn = mk(`<button class="btn" title="Add a child key with {}">+ Child (object)</button>`);
    addBtn.onclick = async () => {
      const key = prompt("New child key:");
      if (!key) return;
      await set(ref(db, `${path}/${key}`), {});
      await loadNode(path);
      await renderTree();
    };
    box.appendChild(addBtn);
  }

  // /data/xbsx/{season}/schedules/reg  → + Week
  if (
    parts.length === 5 &&
    parts[0] === "data" && parts[1] === "xbsx" &&
    parts[3] === "schedules" && parts[4] === "reg"
  ) {
    const addWeek = mk(`<button class="btn">+ Week</button>`);
    addWeek.onclick = async () => {
      const wk = prompt("Week index (e.g., 1 or 2):");
      if (!wk?.trim()) return;
      await set(ref(db, `${path}/${wk.trim()}`), {});
      await loadNode(path);
      await renderTree();
    };
    box.appendChild(addWeek);
  }

  // /data/xbsx/{season}/schedules/reg/{week} → + Game(s)
  if (
    parts.length === 6 &&
    parts[0] === "data" && parts[1] === "xbsx" &&
    parts[3] === "schedules" && parts[4] === "reg"
  ) {
    const season = parts[2];
    const week   = parts[5];

    const addGame = mk(`<button class="btn">+ Game</button>`);
    addGame.onclick = async () => {
      const gi = prompt("Game index (e.g., 0..15):");
      if (gi == null) return;
      await set(ref(db, `${path}/${gi}`), makeGame(season, week, gi));
      await loadNode(path);
      await renderTree();
    };

    const add16 = mk(`<button class="btn">+ 16 Games (0–15)</button>`);
    add16.onclick = async () => {
      const updates = {};
      for (let i = 0; i < 16; i++) updates[i] = makeGame(season, week, i);
      await update(ref(db, path), updates);
      await loadNode(path);
      await renderTree();
    };

    box.appendChild(addGame);
    box.appendChild(add16);
  }
}

function makeGame(seasonId, weekIndex, gameIndex) {
  return {
    awayScore: null,
    awayTeamId: "",
    homeScore: null,
    homeTeamId: "",
    isGameOfTheWeek: false,
    scheduleId: `${seasonId}-reg-${weekIndex}-${gameIndex}`,
    weekIndex: Number(weekIndex),
    status: 0
    // add fields you care about later (seasonIndex, stageIndex, etc.)
  };
}

// ---------- Global actions ----------
async function newSeason() {
  const id = prompt("New Season ID (e.g., 20390713):");
  if (!id) return;
  // Bare skeleton; expand as you like
  const skeleton = { schedules: { pre: {}, reg: {}, post: {} }, stats: { pre: {}, reg: {} }, teams: {} };
  await set(ref(db, `${ROOT}/${id}`), skeleton);
  await renderTree();
  await loadNode(`${ROOT}/${id}`);
}

async function refreshTree() {
  await renderTree();
  // keep /xbsx selected if nothing is selected
  if (!selectedPath) await loadNode(ROOT);
}

// ---------- Wiring ----------
function wire() {
  // Tree interactions (expand/select)
  $("#tree").addEventListener("click", async (e) => {
    const row = e.target.closest(".tree-node");
    if (!row) return;
    const path = row.dataset.path;

    // toggle children when clicking caret
    if (e.target.classList.contains("caret")) {
      let kids = row.nextElementSibling;
      const caret = e.target;
      if (!kids || !kids.classList.contains("children")) {
        kids = await buildChildren(row.parentElement, path);
      }
      kids.classList.toggle("open");
      caret.classList.toggle("open");
      return;
    }

    // select node when clicking label or pill
    if (e.target.classList.contains("tree-label") || e.target.classList.contains("key-pill")) {
      await loadNode(path);
    }
  });

  // Buttons
  $("#saveReplaceBtn").onclick = saveReplace;
  $("#saveMergeBtn").onclick   = saveMerge;
  $("#deleteNodeBtn").onclick  = deleteNode;
  $("#newSeasonBtn").onclick   = newSeason;
  $("#refreshTree").onclick    = refreshTree;

  // Initial
  refreshTree();
}

// Boot immediately or on DOM ready
function boot() {
  try { wire(); } catch (e) { console.error(e); }
}

