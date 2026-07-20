(function initializePosDb() {
  const DB_NAME = "sweet-shop-pos-db";
  const STORE_NAME = "app-state";
  const DB_VERSION = 1;
  const OUTLET_SCOPED_KEYS = new Set([
    "sweet-shop-pos:products",
    "sweet-shop-pos:orders",
    "sweet-shop-pos:expenses",
    "sweet-shop-pos:pending-transfers",
    "sweet-shop-pos:transfer-history",
  ]);
  const GLOBAL_SHARED_KEYS = new Set(["sweet-shop-pos:outlets"]);
  const COMPANY_SHARED_KEYS = new Set([
    "sweet-shop-pos:ledger-entries",
    "sweet-shop-pos:employee-profiles",
    "sweet-shop-pos:employee-attendance",
  ]);
  const SHARED_KEYS = new Set([...OUTLET_SCOPED_KEYS, ...GLOBAL_SHARED_KEYS, ...COMPANY_SHARED_KEYS]);
  const OUTLETS_KEY = "sweet-shop-pos:outlets";
  const ACTIVE_OUTLET_KEY = "sweet-shop-pos:active-outlet";
  const DEFAULT_OUTLET = { id: "main", name: "Main Outlet", createdAt: "2024-01-01T00:00:00.000Z" };
  const API_BASE = "/api/state";
  const AUTH_BASE = "/api/auth";
  let dbPromise;

  function openDb() {
    if (dbPromise) {
      return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return dbPromise;
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function transactionToPromise(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  async function getLocal(key) {
    const db = await openDb();
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const record = await requestToPromise(store.get(key));
    return record ? record.value : undefined;
  }

  async function saveLocal(key, value) {
    const db = await openDb();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.put({ key, value });
    return transactionToPromise(transaction);
  }

  async function migrateLegacy(defaults) {
    await Promise.all(
      Object.keys(defaults).map(async (key) => {
        const existing = await getLocal(key);
        if (existing !== undefined) {
          return;
        }

        try {
          const raw = window.localStorage.getItem(key);
          if (!raw) {
            return;
          }
          await saveLocal(key, JSON.parse(raw));
        } catch (error) {
          console.error(`Failed to migrate legacy key ${key}`, error);
        }
      })
    );
  }

  async function requestJson(url, options) {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
  }

  async function requestText(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    return response.text();
  }

  async function loadSharedMany(defaults) {
    const response = await requestJson(`${API_BASE}/load-many`, {
      method: "POST",
      body: JSON.stringify({ defaults }),
    });
    return response.values || {};
  }

  async function saveShared(key, value) {
    return requestJson(`${API_BASE}/${encodeURIComponent(key)}`, {
      method: "PUT",
      body: JSON.stringify({ value }),
    });
  }

  function normalizeOutletId(value) {
    return (
      String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "main"
    );
  }

  function getActiveOutletId() {
    return normalizeOutletId(window.localStorage.getItem(ACTIVE_OUTLET_KEY) || DEFAULT_OUTLET.id);
  }

  function setActiveOutletId(outletId) {
    const nextOutletId = normalizeOutletId(outletId);
    window.localStorage.setItem(ACTIVE_OUTLET_KEY, nextOutletId);
    return nextOutletId;
  }

  function getScopedKey(key, outletId = getActiveOutletId()) {
    if (!OUTLET_SCOPED_KEYS.has(key)) {
      return key;
    }
    const normalizedOutletId = normalizeOutletId(outletId);
    return normalizedOutletId === DEFAULT_OUTLET.id ? key : `${key}:outlet:${normalizedOutletId}`;
  }

  function isSharedStorageKey(key) {
    if (SHARED_KEYS.has(key)) {
      return true;
    }
    return [...OUTLET_SCOPED_KEYS].some((baseKey) => key.startsWith(`${baseKey}:outlet:`));
  }

  function normalizeOutlet(outlet) {
    const id = normalizeOutletId(outlet?.id || outlet?.name);
    return {
      id,
      name: String(outlet?.name || id).trim() || "Outlet",
      createdAt: outlet?.createdAt || new Date().toISOString(),
    };
  }

  async function getOutlets() {
    let outlets = null;
    try {
      const response = await requestJson("/api/outlets");
      outlets = response.outlets;
    } catch (error) {
      console.warn("Falling back to local outlet list", error);
    }

    if (!outlets) {
      const stored = await loadMany({ [OUTLETS_KEY]: [DEFAULT_OUTLET] });
      outlets = stored[OUTLETS_KEY] || [DEFAULT_OUTLET];
    }

    outlets = outlets.map(normalizeOutlet);
    if (!outlets.some((outlet) => outlet.id === DEFAULT_OUTLET.id)) {
      outlets.unshift(DEFAULT_OUTLET);
    }
    return outlets;
  }

  async function saveOutlets(outlets) {
    const normalized = outlets.map(normalizeOutlet);
    if (!normalized.some((outlet) => outlet.id === DEFAULT_OUTLET.id)) {
      normalized.unshift(DEFAULT_OUTLET);
    }
    await save(OUTLETS_KEY, normalized);
    return normalized;
  }

  async function createOutlet(name) {
    const cleanName = String(name || "").trim();
    if (!cleanName) {
      throw new Error("Outlet name is required.");
    }
    const outlets = await getOutlets();
    let baseId = normalizeOutletId(cleanName);
    let id = baseId;
    let index = 2;
    while (outlets.some((outlet) => outlet.id === id)) {
      id = `${baseId}-${index}`;
      index += 1;
    }
    const nextOutlet = { id, name: cleanName, createdAt: new Date().toISOString() };
    await saveOutlets([...outlets, nextOutlet]);
    return nextOutlet;
  }

  async function getActiveOutlet() {
    const outletId = getActiveOutletId();
    const outlets = await getOutlets();
    return outlets.find((outlet) => outlet.id === outletId) || outlets[0] || DEFAULT_OUTLET;
  }

  async function loadMany(defaults) {
    const keyedDefaults = {};
    const keyMap = {};
    Object.entries(defaults).forEach(([key, value]) => {
      const scopedKey = getScopedKey(key);
      keyedDefaults[scopedKey] = value;
      keyMap[scopedKey] = key;
    });

    await migrateLegacy(keyedDefaults);

    const sharedDefaults = {};
    const localDefaults = {};
    Object.entries(keyedDefaults).forEach(([key, value]) => {
      if (isSharedStorageKey(key)) {
        sharedDefaults[key] = value;
      } else {
        localDefaults[key] = value;
      }
    });

    const entries = {};

    if (Object.keys(localDefaults).length) {
      const localEntries = await Promise.all(
        Object.entries(localDefaults).map(async ([key, fallback]) => {
          const value = await getLocal(key);
          return [key, value === undefined ? fallback : value];
        })
      );
      Object.assign(entries, Object.fromEntries(localEntries));
    }

    if (Object.keys(sharedDefaults).length) {
      try {
        Object.assign(entries, await loadSharedMany(sharedDefaults));
      } catch (error) {
        console.warn("Falling back to local shared storage", error);
        const sharedEntries = await Promise.all(
          Object.entries(sharedDefaults).map(async ([key, fallback]) => {
            const value = await getLocal(key);
            return [key, value === undefined ? fallback : value];
          })
        );
        Object.assign(entries, Object.fromEntries(sharedEntries));
      }
    }

    return Object.fromEntries(Object.entries(entries).map(([key, value]) => [keyMap[key] || key, value]));
  }

  async function save(key, value) {
    const scopedKey = getScopedKey(key);
    if (isSharedStorageKey(scopedKey)) {
      try {
        await saveShared(scopedKey, value);
        return;
      } catch (error) {
        console.warn(`Falling back to local save for ${scopedKey}`, error);
      }
    }

    await saveLocal(scopedKey, value);
  }

  async function login(role, password) {
    return requestJson(`${AUTH_BASE}/login`, {
      method: "POST",
      body: JSON.stringify({ role, password }),
    });
  }

  async function logout() {
    return requestJson(`${AUTH_BASE}/logout`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  async function getSession() {
    return requestJson(`${AUTH_BASE}/session`);
  }

  async function getServerInfo() {
    return requestJson("/api/server-info");
  }

  async function restoreBackup(sql) {
    return requestJson("/api/admin/restore", {
      method: "POST",
      body: JSON.stringify({ sql }),
    });
  }

  async function getAuditLogs() {
    return requestJson("/api/admin/audit-logs");
  }

  async function getOwnerEmployees() {
    return requestJson("/api/owner/employees");
  }

  async function createOwnerEmployee(payload) {
    return requestJson("/api/owner/employees", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async function updateOwnerEmployee(username, payload) {
    return requestJson(`/api/owner/employees/${encodeURIComponent(username)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async function deleteOwnerEmployee(username) {
    return requestJson(`/api/owner/employees/${encodeURIComponent(username)}`, {
      method: "DELETE",
    });
  }

  async function completeOrder(order) {
    return requestJson("/api/orders/complete", {
      method: "POST",
      body: JSON.stringify({ order, outletId: getActiveOutletId() }),
    });
  }

  async function downloadBackup() {
    return requestText("/api/admin/backup");
  }

  function watch(keys, callback, intervalMs = 5000) {
    let previousSnapshot = "";

    async function poll() {
      const defaults = Object.fromEntries(keys.map((key) => [key, null]));
      const values = await loadMany(defaults);
      const nextSnapshot = JSON.stringify(values);
      if (previousSnapshot && previousSnapshot !== nextSnapshot) {
        callback(values);
      }
      previousSnapshot = nextSnapshot;
    }

    poll().catch((error) => console.warn("Initial watch poll failed", error));
    const timer = window.setInterval(() => {
      poll().catch((error) => console.warn("Watch poll failed", error));
    }, intervalMs);

    return () => window.clearInterval(timer);
  }

  window.PosDb = {
    completeOrder,
    createOutlet,
    createOwnerEmployee,
    deleteOwnerEmployee,
    downloadBackup,
    getActiveOutlet,
    getActiveOutletId,
    getAuditLogs,
    getOutlets,
    getOwnerEmployees,
    getServerInfo,
    getSession,
    login,
    loadMany,
    logout,
    restoreBackup,
    save,
    saveOutlets,
    setActiveOutletId,
    updateOwnerEmployee,
    watch,
  };
})();
