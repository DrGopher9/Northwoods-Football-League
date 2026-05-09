// scripts/admin_rules.js
import { db } from "./firebaseConfig.js";
import { ref, get, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { RULES as FALLBACK_RULES } from "./rulesData.js";

// ✏️ If you changed where rules live, update this:
const CFG_PATH = "config/rules";

const $  = (s, el=document) => el.querySelector(s);
const mk = (html) => { const d=document.createElement("div"); d.innerHTML=html.trim(); return d.firstElementChild; };
const slug = (s) => (s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

let draft = [];        // array of sections
let currentSec = null; // selected section object
let currentRule = null;

/* ---------------- Drag & drop helpers ---------------- */
function getDragAfterElement(container, y, selector) {
  const els = [...container.querySelectorAll(`${selector}:not(.dragging)`)];

  let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
  for (const child of els) {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      closest = { offset, element: child };
    }
  }
  return closest.element;
}

function enableSort(listEl, opts) {
  // opts: { itemSelector, idAttr, onReordered }
  let draggingEl = null;

  listEl.addEventListener("dragstart", (e) => {
    const item = e.target.closest(opts.itemSelector);
    if (!item) return;
    // Don't start a drag when the user grabs a button
    if (e.target.closest("button")) return e.preventDefault();

    draggingEl = item;
    item.classList.add("dragging");
    item.style.width = `${item.offsetWidth}px`; // stabilize layout during drag
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", item.dataset[opts.idAttr] || ""); } catch {}
  });

  listEl.addEventListener("dragend", () => {
    if (!draggingEl) return;
    draggingEl.classList.remove("dragging");
    draggingEl.style.removeProperty("width");
    const ids = Array.from(listEl.querySelectorAll(opts.itemSelector))
      .map(el => el.dataset[opts.idAttr]);
    draggingEl = null;
    opts.onReordered?.(ids);
  });

  listEl.addEventListener("dragover", (e) => {
    if (!draggingEl) return;
    e.preventDefault();
    const afterEl = getDragAfterElement(listEl, e.clientY, opts.itemSelector);
    if (afterEl == null) listEl.appendChild(draggingEl);
    else listEl.insertBefore(draggingEl, afterEl);
  });
}

function reorderByIds(arr, ids, key) {
  const byId = new Map(arr.map(x => [x[key], x]));
  return ids.map(id => byId.get(id)).filter(Boolean);
}
/* ---------------------------------------------------- */

async function load() {
  try {
    const snap = await get(ref(db, CFG_PATH));
    draft = snap.exists() && Array.isArray(snap.val())
      ? snap.val()
      : JSON.parse(JSON.stringify(FALLBACK_RULES));
  } catch {
    draft = JSON.parse(JSON.stringify(FALLBACK_RULES));
  }
  renderSections();
  clearEditors();
}

function saveAll() {
  return set(ref(db, CFG_PATH), draft);
}

function clearEditors() {
  $("#sectionFormWrap").innerHTML = `<p class="mini">Select a section to edit, or click <strong>+ Section</strong>.</p>`;
  $("#ruleFormWrap").innerHTML = `<p class="mini">Select a rule to edit, or click <strong>+ Rule</strong> inside a section.</p>`;
}

/* ---------------- Sections list ---------------- */
function renderSections() {
  const list = $("#sectionsList");
  list.innerHTML = "";

  draft.forEach((sec, idx) => {
    const row = mk(`
      <div class="card draggable section-row" draggable="true" data-secid="${sec.id}" style="padding:.5rem;margin-bottom:.5rem;">
        <div style="display:flex;gap:.5rem;align-items:center;">
          <span title="Drag to reorder" style="opacity:.7;user-select:none;">↕</span>
          <button class="btn" data-up>▲</button>
          <button class="btn" data-down>▼</button>
          <button class="btn" data-edit>Edit</button>
          <button class="btn" data-del>Delete</button>
          <span style="margin-left:.5rem;opacity:.85;">${sec.title}</span>
        </div>
      </div>
    `);

    row.querySelector("[data-up]").onclick = () => {
      if (idx > 0) { [draft[idx-1], draft[idx]] = [draft[idx], draft[idx-1]]; renderSections(); if (currentSec) editSection(currentSec); }
    };
    row.querySelector("[data-down]").onclick = () => {
      if (idx < draft.length - 1) { [draft[idx+1], draft[idx]] = [draft[idx], draft[idx+1]]; renderSections(); if (currentSec) editSection(currentSec); }
    };
    row.querySelector("[data-edit]").onclick = () => editSection(sec);
    row.querySelector("[data-del]").onclick = () => {
      if (!confirm(`Delete section "${sec.title}"?`)) return;
      draft = draft.filter(s => s !== sec);
      if (currentSec === sec) { currentSec = null; clearEditors(); }
      renderSections();
    };
    list.appendChild(row);
  });

  // Enable drag sort for sections
  enableSort(list, {
    itemSelector: ".section-row",
    idAttr: "secid",
    onReordered: (ids) => {
      draft = reorderByIds(draft, ids, "id");
      renderSections();
      if (currentSec) editSection(currentSec);
    }
  });
}

/* ---------------- Section editor & rules list ---------------- */
function editSection(sec) {
  currentSec = sec;
  const wrap = $("#sectionFormWrap");
  wrap.innerHTML = "";
  const form = mk(`
    <div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;">
        <label>Section Title<input id="secTitle" type="text" value="${sec.title||""}"></label>
        <label>Section ID (slug)<input id="secId" type="text" value="${sec.id||slug(sec.title)}"></label>
      </div>
      <div style="margin:.5rem 0;display:flex;gap:.5rem;">
        <button class="btn" id="saveSec">Save Section</button>
        <button class="btn" id="addRule">+ Rule</button>
      </div>
      <h3>Rules in this section</h3>
      <div id="rulesList"></div>
    </div>
  `);
  wrap.appendChild(form);

  $("#saveSec").onclick = () => {
    sec.title = $("#secTitle").value.trim();
    sec.id = $("#secId").value.trim() || slug(sec.title);
    renderSections();
    alert("Section updated (not yet published). Click Save (top-left) to publish.");
  };

  $("#addRule").onclick = () => {
    const newRule = { id: `rule-${Math.random().toString(36).slice(2,7)}`, heading: "New Rule", html: "<p>…</p>" };
    sec.items = Array.isArray(sec.items) ? sec.items : [];
    sec.items.push(newRule);
    renderRulesList(sec);
    editRule(newRule);
  };

  renderRulesList(sec);
}

function renderRulesList(sec) {
  const list = $("#rulesList");
  list.innerHTML = "";

  (sec.items || []).forEach((it, idx) => {
    const row = mk(`
      <div class="card draggable rule-row" draggable="true" data-ruleid="${it.id}" style="padding:.5rem;margin:.35rem 0;">
        <div style="display:flex;gap:.5rem;align-items:center;">
          <span title="Drag to reorder" style="opacity:.7;user-select:none;">↕</span>
          <button class="btn" data-up>▲</button>
          <button class="btn" data-down>▼</button>
          <button class="btn" data-edit>Edit</button>
          <button class="btn" data-del>Delete</button>
          <span style="margin-left:.5rem;opacity:.85;">${it.heading}</span>
        </div>
      </div>
    `);

    row.querySelector("[data-up]").onclick = () => {
      if (idx > 0) { [sec.items[idx-1], sec.items[idx]] = [sec.items[idx], sec.items[idx-1]]; renderRulesList(sec); if (currentRule) editRule(currentRule); }
    };
    row.querySelector("[data-down]").onclick = () => {
      if (idx < sec.items.length - 1) { [sec.items[idx+1], sec.items[idx]] = [sec.items[idx], sec.items[idx+1]]; renderRulesList(sec); if (currentRule) editRule(currentRule); }
    };
    row.querySelector("[data-edit]").onclick = () => editRule(it);
    row.querySelector("[data-del]").onclick = () => {
      if (!confirm(`Delete rule "${it.heading}"?`)) return;
      sec.items = sec.items.filter(r => r !== it);
      if (currentRule === it) { currentRule = null; $("#ruleFormWrap").innerHTML = `<p class="mini">Select a rule to edit, or click <strong>+ Rule</strong>.</p>`; }
      renderRulesList(sec);
    };
    list.appendChild(row);
  });

  // Enable drag sort for rules within this section
  enableSort(list, {
    itemSelector: ".rule-row",
    idAttr: "ruleid",
    onReordered: (ids) => {
      sec.items = reorderByIds(sec.items || [], ids, "id");
      renderRulesList(sec);
      if (currentRule) editRule(currentRule);
    }
  });
}

/* ---------------- Rule editor ---------------- */
function editRule(rule) {
  currentRule = rule;
  const wrap = $("#ruleFormWrap");
  wrap.innerHTML = "";
  const form = mk(`
    <div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;">
        <label>Rule Heading<input id="ruleHeading" type="text" value="${rule.heading||""}"></label>
        <label>Rule ID (slug)<input id="ruleId" type="text" value="${rule.id||slug(rule.heading)}"></label>
      </div>
      <label style="display:block;margin-top:.5rem;">HTML Body
        <textarea id="ruleHtml" style="width:100%;min-height:220px;">${rule.html||""}</textarea>
      </label>
      <div style="display:flex;gap:.5rem;margin-top:.5rem;">
        <button class="btn" id="saveRule">Save Rule</button>
        <button class="btn" id="previewRule">Preview</button>
      </div>
      <div id="rulePreview" class="card" style="margin-top:.5rem;"></div>
    </div>
  `);
  wrap.appendChild(form);

  $("#saveRule").onclick = () => {
    rule.heading = $("#ruleHeading").value.trim() || "Untitled";
    rule.id = $("#ruleId").value.trim() || slug(rule.heading);
    rule.html = $("#ruleHtml").value;
    alert("Rule updated (not yet published). Click Save (left panel) to publish.");
    renderRulesList(currentSec);
  };

  $("#previewRule").onclick = () => {
    $("#rulePreview").innerHTML = sanitize($("#ruleHtml").value);
  };
}

/* ---------------- Sanitizer (same as public page) ---------------- */
function sanitize(html) {
  const allowed = new Set(["P","UL","OL","LI","STRONG","EM","A","BR","H3","H4","CODE","BLOCKQUOTE","SPAN"]);
  const t = document.createElement("template");
  t.innerHTML = html ?? "";
  const walk = (n) => {
    if (n.nodeType === 1) {
      const tag = n.tagName;
      if (!allowed.has(tag)) { n.replaceWith(...Array.from(n.childNodes)); return; }
      [...n.attributes].forEach(a => {
        if (tag === "A" && a.name === "href" && (/^https?:\/\//i.test(a.value) || a.value.startsWith("#"))) {
          // keep safe hrefs
        } else {
          n.removeAttribute(a.name);
        }
      });
    }
    [...n.childNodes].forEach(walk);
  };
  [...t.content.childNodes].forEach(walk);
  return t.innerHTML;
}

/* ---------------- Wire top buttons ---------------- */
$("#addSectionBtn")?.addEventListener("click", () => {
  const sec = { id: `sec-${Math.random().toString(36).slice(2,7)}`, title: "New Section", items: [] };
  draft.push(sec);
  renderSections();
  editSection(sec);
});

$("#saveAllRulesBtn")?.addEventListener("click", async () => {
  try {
    // normalize
    draft.forEach(s => {
      s.id = s.id || slug(s.title);
      s.items = Array.isArray(s.items) ? s.items : [];
      s.items.forEach(it => { it.id = it.id || slug(it.heading); it.html = it.html || ""; });
    });
    await saveAll();
    alert("Rules published!");
  } catch (e) {
    console.error(e);
    alert("Save failed. Check console.");
  }
});

function __initRulesOnce() {
  if (window.__rulesInitDone) return;
  window.__rulesInitDone = true;
  load();
}

// Run whether the module was loaded before or after DOMContentLoaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", __initRulesOnce, { once: true });
} else {
  __initRulesOnce();
}

// If the browser restores the page from cache, re-render if list is empty
window.addEventListener("pageshow", () => {
  const list = document.getElementById("sectionsList");
  if (list && !list.childElementCount) load();
});

// Optional: allow adminHub (or anyone) to force-init when the tab is shown
window.nwflRulesInit = () => {
  const list = document.getElementById("sectionsList");
  if (!list || !list.childElementCount) load();
};

