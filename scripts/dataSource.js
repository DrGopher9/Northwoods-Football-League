// scripts/dataSource.js
import { db } from "./firebaseConfig.js";
import {
  ref, get, set, update, child, onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/**
 * RTDB shape used by this helper:
 * - config/sourceMode: "manual" | "auto"
 * - config/paths/autoRoot: "data/xbsx/20390713"            // default for auto
 * - config/paths/manualRoot: "config"                      // default for manual
 */
const DEFAULTS = {
  manualRoot: "config",
  autoRoot: "data/xbsx/20390713",
};

async function getPaths() {
  const snap = await get(ref(db, "config/paths"));
  const paths = snap.exists() ? snap.val() : {};
  return {
    manualRoot: paths.manualRoot || DEFAULTS.manualRoot,
    autoRoot: paths.autoRoot || DEFAULTS.autoRoot,
  };
}

export async function getSourceMode() {
  const snap = await get(ref(db, "config/sourceMode"));
  return snap.exists() ? snap.val() : "manual";
}

export async function setSourceMode(mode) {
  if (!["manual","auto"].includes(mode)) throw new Error("invalid mode");
  await set(ref(db, "config/sourceMode"), mode);
}

export async function getRoots() {
  const [mode, paths] = await Promise.all([getSourceMode(), getPaths()]);
  const rootPath = (mode === "manual") ? paths.manualRoot : paths.autoRoot;
  return {
    mode,
    rootPath,
    readRef: ref(db, rootPath),
    writeRef: ref(db, rootPath),
  };
}

export async function readJSON(subpath = "") {
  const { readRef } = await getRoots();
  const snap = await get(subpath ? child(readRef, subpath) : readRef);
  return snap.exists() ? snap.val() : null;
}

export async function writeReplace(subpath, value) {
  const { writeRef } = await getRoots();
  return set(child(writeRef, subpath), value);
}

export async function writeMerge(subpath, value) {
  // For RTDB you "merge" by update() on a leaf object.
  const { writeRef } = await getRoots();
  return update(child(writeRef, subpath), value);
}

// Live subscription to show current mode in the UI (optional)
export function onSourceModeChange(cb) {
  return onValue(ref(db, "config/sourceMode"), (s) => cb(s.exists() ? s.val() : "manual"));
}
