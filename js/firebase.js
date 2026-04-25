// Lightweight localStorage-backed shim to match the Firebase Realtime DB calls
// used by this project (db/ref/push/onValue/remove). This keeps the app working
// without external dependencies, and works over file:// too (no ES modules).

const db = { __type: "localStorage-db" };

const STORAGE_PREFIX = "ExpenseFlow:";
const listeners = new Map(); // path -> Set<callback>

function storageKey(path) {
  return `${STORAGE_PREFIX}${path}`;
}

function readPath(path) {
  const raw = localStorage.getItem(storageKey(path));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writePath(path, value) {
  localStorage.setItem(storageKey(path), JSON.stringify(value));
}

function notify(path) {
  const set = listeners.get(path);
  if (!set || set.size === 0) return;

  const snapshot = {
    val: () => readPath(path),
  };

  set.forEach((cb) => {
    try {
      cb(snapshot);
    } catch {
      // ignore listener errors
    }
  });
}

function ref(_db, path) {
  return { path };
}

function push(refObj, value) {
  const path = refObj.path;
  const current = readPath(path) || {};
  const id = `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  current[id] = value;
  writePath(path, current);
  notify(path);
  return { key: id };
}

function remove(refObj) {
  const full = refObj.path;

  // Supports: "expenses/<id>"
  const parts = full.split("/").filter(Boolean);
  if (parts.length < 2) return;

  const root = parts[0];
  const id = parts[1];

  const current = readPath(root) || {};
  if (current && Object.prototype.hasOwnProperty.call(current, id)) {
    delete current[id];
    writePath(root, current);
    notify(root);
  }
}

function onValue(refObj, callback) {
  const path = refObj.path;
  if (!listeners.has(path)) listeners.set(path, new Set());
  listeners.get(path).add(callback);

  // fire immediately
  callback({
    val: () => readPath(path),
  });

  // cross-tab updates
  window.addEventListener("storage", (e) => {
    if (e.key === storageKey(path)) {
      notify(path);
    }
  });
}

// Expose globals (to match original ui.js usage style)
window.db = db;
window.ref = ref;
window.push = push;
window.onValue = onValue;
window.remove = remove;

