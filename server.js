require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { promisify } = require("util");
const { execFile } = require("child_process");
const bcrypt = require("bcryptjs");
const USE_LOCAL_DB = String(process.env.LOCAL_DB || "").toLowerCase() === "true";
const { Pool } = USE_LOCAL_DB ? require("./local-db") : require("pg");

const execFileAsync = promisify(execFile);
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "";
const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/sweet_shop_pos";
const SESSION_SECRET = process.env.SESSION_SECRET || "change-this-session-secret";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const CASHIER_PASSWORD = process.env.CASHIER_PASSWORD || "cashier123";
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || "800688";
const RESET_DEFAULT_USERS = String(process.env.RESET_DEFAULT_USERS || "").toLowerCase() === "true";
const PG_BIN_DIR = process.env.PG_BIN_DIR || "C:\\Program Files\\PostgreSQL\\16\\bin";
const AUTO_DAILY_BACKUP_TIME = process.env.AUTO_DAILY_BACKUP_TIME || "23:00";
const COOKIE_SECURE = String(process.env.COOKIE_SECURE || "").toLowerCase() === "true";
const TRUST_PROXY = String(process.env.TRUST_PROXY || "").toLowerCase() === "true";
const SESSION_COOKIE = "pos_session";
const BACKUP_DIR = path.join(__dirname, "backups");
const pool = new Pool({
  connectionString: DATABASE_URL,
});

const app = express();
if (TRUST_PROXY) {
  app.set("trust proxy", 1);
}
app.use((_request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "SAMEORIGIN");
  response.setHeader("Referrer-Policy", "same-origin");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
app.use(express.json({ limit: "20mb" }));
app.use(express.static(path.join(__dirname)));

function getCookieValue(request, name) {
  const cookieHeader = request.headers.cookie || "";
  const cookies = cookieHeader.split(";").map((part) => part.trim());
  const match = cookies.find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function setSessionCookie(response, token) {
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${COOKIE_SECURE ? "; Secure" : ""}`
  );
}

function clearSessionCookie(response) {
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${COOKIE_SECURE ? "; Secure" : ""}`
  );
}

function parseDatabaseUrl(connectionString) {
  const url = new URL(connectionString);
  return {
    host: url.hostname,
    port: url.port || "5432",
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
  };
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      username TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK (role IN ('Admin', 'Cashier', 'Owner')),
      display_name TEXT NOT NULL DEFAULT '',
      access_scope TEXT NOT NULL DEFAULT 'Cashier',
      password_hash TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_sessions (
      token TEXT PRIMARY KEY,
      username TEXT NOT NULL REFERENCES app_users(username) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('Admin', 'Cashier', 'Owner')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    )
  `);

  await pool.query(`
    CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      actor_username TEXT,
      actor_role TEXT,
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check");
  await pool.query("ALTER TABLE app_sessions DROP CONSTRAINT IF EXISTS app_sessions_role_check");
  await pool.query("ALTER TABLE app_users ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT ''");
  await pool.query("ALTER TABLE app_users ADD COLUMN IF NOT EXISTS access_scope TEXT NOT NULL DEFAULT 'Cashier'");
  await pool.query(`
    ALTER TABLE app_users
    ADD CONSTRAINT app_users_role_check
    CHECK (role IN ('Admin', 'Cashier', 'Owner'))
  `).catch(() => {});
  await pool.query(`
    ALTER TABLE app_sessions
    ADD CONSTRAINT app_sessions_role_check
    CHECK (role IN ('Admin', 'Cashier', 'Owner'))
  `).catch(() => {});

  await seedUsers();
}

async function seedUsers() {
  await seedDefaultUser("admin", "Admin", "Admin", "Admin", ADMIN_PASSWORD);
  await seedDefaultUser("cashier", "Cashier", "Cashier", "Cashier", CASHIER_PASSWORD);
  await seedDefaultUser("owner", "Owner", "Owner", "Owner", OWNER_PASSWORD);
}

async function seedDefaultUser(username, displayName, role, accessScope, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  if (RESET_DEFAULT_USERS) {
    await upsertUserWithHash(username, displayName, role, accessScope, passwordHash);
    return;
  }

  await pool.query(
    `
      INSERT INTO app_users (username, display_name, role, access_scope, password_hash, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (username)
      DO NOTHING
    `,
    [username, displayName, role, accessScope, passwordHash]
  );
}

async function upsertUser(username, displayName, role, accessScope, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  await upsertUserWithHash(username, displayName, role, accessScope, passwordHash);
}

async function upsertUserWithHash(username, displayName, role, accessScope, passwordHash) {
  await pool.query(
    `
      INSERT INTO app_users (username, display_name, role, access_scope, password_hash, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (username)
      DO UPDATE SET
        display_name = EXCLUDED.display_name,
        role = EXCLUDED.role,
        access_scope = EXCLUDED.access_scope,
        password_hash = EXCLUDED.password_hash,
        updated_at = NOW()
    `,
    [username, displayName, role, accessScope, passwordHash]
  );
}

async function getStateValue(key) {
  const result = await pool.query("SELECT value FROM app_state WHERE key = $1", [key]);
  return result.rows[0]?.value;
}

async function saveStateValue(key, value) {
  await pool.query(
    `
      INSERT INTO app_state (key, value, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `,
    [key, JSON.stringify(value)]
  );
}

async function recordAuditLog(actor, action, target, details = {}) {
  await pool.query(
    `
      INSERT INTO audit_logs (actor_username, actor_role, action, target, details)
      VALUES ($1, $2, $3, $4, $5::jsonb)
    `,
    [
      actor?.username || null,
      actor?.role || null,
      action,
      target,
      JSON.stringify(details),
    ]
  );
}

async function createSession(username, role) {
  const token = crypto.createHmac("sha256", SESSION_SECRET).update(crypto.randomUUID()).digest("hex");
  await pool.query(
    `
      INSERT INTO app_sessions (token, username, role, expires_at)
      VALUES ($1, $2, $3, NOW() + INTERVAL '30 days')
    `,
    [token, username, role]
  );
  return token;
}

async function getSession(token) {
  if (!token) {
    return null;
  }

  const result = await pool.query(
    `
      SELECT
        sessions.token,
        sessions.username,
        sessions.role,
        users.display_name,
        users.access_scope
      FROM app_sessions sessions
      JOIN app_users users ON users.username = sessions.username
      WHERE sessions.token = $1 AND sessions.expires_at > NOW()
    `,
    [token]
  );
  return result.rows[0] || null;
}

async function deleteSession(token) {
  if (!token) {
    return;
  }
  await pool.query("DELETE FROM app_sessions WHERE token = $1", [token]);
}

async function attachSession(request, _response, next) {
  try {
    request.sessionUser = await getSession(getCookieValue(request, SESSION_COOKIE));
    next();
  } catch (error) {
    next(error);
  }
}

function requireAuth(request, response, next) {
  if (!request.sessionUser) {
    response.status(401).json({ ok: false, error: "Authentication required." });
    return;
  }
  next();
}

function requireElevated(request, response, next) {
  if (!request.sessionUser || !["Admin", "Owner"].includes(request.sessionUser.role)) {
    response.status(403).json({ ok: false, error: "Admin or Owner access required." });
    return;
  }
  next();
}

function requireOwner(request, response, next) {
  if (!request.sessionUser || request.sessionUser.role !== "Owner") {
    response.status(403).json({ ok: false, error: "Owner access required." });
    return;
  }
  next();
}

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `employee-${Date.now()}`;
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

function getOutletStateKey(baseKey, outletId) {
  const normalizedOutletId = normalizeOutletId(outletId);
  return normalizedOutletId === "main" ? baseKey : `${baseKey}:outlet:${normalizedOutletId}`;
}

function getNetworkUrls() {
  const interfaces = os.networkInterfaces();
  const urls = [];

  Object.values(interfaces).forEach((entries) => {
    (entries || []).forEach((entry) => {
      if (entry.family === "IPv4" && !entry.internal) {
        urls.push(`http://${entry.address}:${PORT}`);
      }
    });
  });

  return urls;
}

function parseClockTime(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value).trim());
  if (!match) {
    return { hours: 23, minutes: 0 };
  }

  const hours = Math.max(0, Math.min(23, Number(match[1])));
  const minutes = Math.max(0, Math.min(59, Number(match[2])));
  return { hours, minutes };
}

async function createBackupFile() {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  if (USE_LOCAL_DB) {
    const filePath = path.join(BACKUP_DIR, `sweet-shop-pos-local-${timestamp}.json`);
    const localDataPath = path.join(__dirname, "local-data", "pos-db.json");
    await fs.copyFile(localDataPath, filePath);
    return filePath;
  }

  const db = parseDatabaseUrl(DATABASE_URL);
  const filePath = path.join(BACKUP_DIR, `sweet-shop-pos-${timestamp}.sql`);
  const pgDumpPath = path.join(PG_BIN_DIR, "pg_dump.exe");

  await execFileAsync(
    pgDumpPath,
    ["-h", db.host, "-p", db.port, "-U", db.user, "-d", db.database, "-f", filePath],
    {
      env: {
        ...process.env,
        PGPASSWORD: db.password,
      },
      windowsHide: true,
    }
  );

  return filePath;
}

function scheduleAutomaticBackups() {
  const { hours, minutes } = parseClockTime(AUTO_DAILY_BACKUP_TIME);

  const queueNextRun = () => {
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const delay = nextRun.getTime() - now.getTime();
    setTimeout(async () => {
      try {
        const filePath = await createBackupFile();
        await recordAuditLog(
          { username: "system", role: "Admin" },
          "db.backup.auto",
          "database",
          { filePath: path.basename(filePath) }
        );
        console.log(`Automatic backup created: ${path.basename(filePath)}`);
      } catch (error) {
        console.error("Automatic backup failed", error);
      } finally {
        queueNextRun();
      }
    }, delay);
  };

  queueNextRun();
  console.log(`Automatic daily backup scheduled for ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
}

function getProductionWarnings() {
  const warnings = [];
  if (SESSION_SECRET === "change-this-session-secret") {
    warnings.push("SESSION_SECRET is still the default value.");
  }
  if (ADMIN_PASSWORD === "admin123") {
    warnings.push("ADMIN_PASSWORD is still the default value.");
  }
  if (CASHIER_PASSWORD === "cashier123") {
    warnings.push("CASHIER_PASSWORD is still the default value.");
  }
  if (OWNER_PASSWORD === "800688") {
    warnings.push("OWNER_PASSWORD is still the default value.");
  }
  if (!USE_LOCAL_DB && DATABASE_URL.includes("postgres:postgres@")) {
    warnings.push("DATABASE_URL appears to use the default postgres password.");
  }
  if (!COOKIE_SECURE && PUBLIC_BASE_URL.startsWith("https://")) {
    warnings.push("COOKIE_SECURE should be true for HTTPS.");
  }
  return warnings;
}

function logProductionWarnings() {
  const warnings = getProductionWarnings();
  if (!warnings.length) {
    return;
  }
  console.warn("Production setup warnings:");
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}

async function restoreBackup(sqlText) {
  const db = parseDatabaseUrl(DATABASE_URL);
  const psqlPath = path.join(PG_BIN_DIR, "psql.exe");
  const tempFile = path.join(BACKUP_DIR, `restore-${Date.now()}.sql`);

  await fs.mkdir(BACKUP_DIR, { recursive: true });
  await fs.writeFile(tempFile, sqlText, "utf8");

  try {
    await execFileAsync(
      psqlPath,
      ["-h", db.host, "-p", db.port, "-U", db.user, "-d", db.database, "-f", tempFile],
      {
        env: {
          ...process.env,
          PGPASSWORD: db.password,
        },
        windowsHide: true,
      }
    );
  } finally {
    await fs.unlink(tempFile).catch(() => {});
  }
}

app.use(attachSession);

app.get("/api/health", async (_request, response) => {
  try {
    await pool.query("SELECT 1");
    response.json({ ok: true, networkUrls: getNetworkUrls() });
  } catch (error) {
    response.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/auth/session", (request, response) => {
  response.json({
    ok: true,
    user: request.sessionUser
      ? {
          username: request.sessionUser.username,
          role: request.sessionUser.role,
          displayName: request.sessionUser.display_name || request.sessionUser.username,
        }
      : null,
  });
});

app.post("/api/auth/login", async (request, response) => {
  const role = request.body?.role;
  const password = request.body?.password || "";
  if (!["Admin", "Cashier", "Owner"].includes(role)) {
    response.status(400).json({ ok: false, error: "Invalid role." });
    return;
  }

  const result =
    role === "Owner"
      ? await pool.query(
          "SELECT username, display_name, role, access_scope, password_hash FROM app_users WHERE username = 'owner'"
        )
      : await pool.query(
          `
            SELECT username, display_name, role, access_scope, password_hash
            FROM app_users
            WHERE role <> 'Owner' AND access_scope IN ($1, 'Both')
          `,
          [role]
        );

  let user = null;
  for (const candidate of result.rows) {
    if (await bcrypt.compare(password, candidate.password_hash)) {
      user = candidate;
      break;
    }
  }

  if (!user) {
    response.status(401).json({ ok: false, error: "Wrong password." });
    return;
  }

  const effectiveRole = role === "Owner" ? "Owner" : role;
  const token = await createSession(user.username, effectiveRole);
  await recordAuditLog(
    { username: user.username, role: effectiveRole },
    "auth.login",
    "session",
    { username: user.username, requestedRole: effectiveRole, accessScope: user.access_scope }
  );
  setSessionCookie(response, token);
  response.json({
    ok: true,
    user: {
      username: user.username,
      role: effectiveRole,
      displayName: user.display_name || user.username,
    },
  });
});

app.post("/api/auth/logout", async (request, response) => {
  if (request.sessionUser) {
    await recordAuditLog(request.sessionUser, "auth.logout", "session", {});
  }
  await deleteSession(getCookieValue(request, SESSION_COOKIE));
  clearSessionCookie(response);
  response.json({ ok: true });
});

app.get("/api/server-info", requireElevated, (_request, response) => {
  response.json({
    ok: true,
    localUrl: PUBLIC_BASE_URL || `http://localhost:${PORT}`,
    networkUrls: getNetworkUrls(),
  });
});

app.get("/api/admin/system-status", requireElevated, (_request, response) => {
  response.json({
    ok: true,
    database: USE_LOCAL_DB ? "local-file" : "postgres",
    backupTime: AUTO_DAILY_BACKUP_TIME,
    cookieSecure: COOKIE_SECURE,
    trustProxy: TRUST_PROXY,
    warnings: getProductionWarnings(),
  });
});

app.get("/api/outlets", async (_request, response) => {
  const defaultOutlets = [{ id: "main", name: "Main Outlet", createdAt: "2024-01-01T00:00:00.000Z" }];
  const outlets = (await getStateValue("sweet-shop-pos:outlets")) || defaultOutlets;
  const publicOutlets = outlets.map((outlet) => ({
    id: normalizeOutletId(outlet.id || outlet.name),
    name: String(outlet.name || outlet.id || "Outlet"),
  }));
  if (!publicOutlets.some((outlet) => outlet.id === "main")) {
    publicOutlets.unshift(defaultOutlets[0]);
  }
  response.json({ ok: true, outlets: publicOutlets });
});

app.get("/api/admin/backup", requireElevated, async (_request, response) => {
  const filePath = await createBackupFile();
  await recordAuditLog(_request.sessionUser, "db.backup", "database", {
    filePath: path.basename(filePath),
  });
  response.download(filePath);
});

app.post("/api/admin/restore", requireElevated, async (request, response) => {
  const sql = request.body?.sql;
  if (!sql || typeof sql !== "string") {
    response.status(400).json({ ok: false, error: "SQL backup content is required." });
    return;
  }

  await restoreBackup(sql);
  await recordAuditLog(request.sessionUser, "db.restore", "database", {});
  response.json({ ok: true });
});

app.get("/api/admin/audit-logs", requireElevated, async (_request, response) => {
  const result = await pool.query(
    `
      SELECT id, actor_username, actor_role, action, target, details, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 30
    `
  );
  response.json({ ok: true, logs: result.rows });
});

app.get("/api/owner/employees", requireOwner, async (_request, response) => {
  const result = await pool.query(
    `
      SELECT username, display_name, access_scope, role, updated_at
      FROM app_users
      WHERE role <> 'Owner'
      ORDER BY updated_at DESC
    `
  );
  response.json({ ok: true, employees: result.rows });
});

app.post("/api/owner/employees", requireOwner, async (request, response) => {
  const name = String(request.body?.name || "").trim();
  const access = String(request.body?.access || "").trim();
  const password = String(request.body?.password || "");

  if (!name || !["Admin", "Cashier", "Both"].includes(access) || password.length < 4) {
    response.status(400).json({ ok: false, error: "Valid employee details are required." });
    return;
  }

  const usernameBase = normalizeUsername(name);
  const username = `${usernameBase}-${Date.now()}`;
  const role = access === "Admin" ? "Admin" : "Cashier";
  await upsertUser(username, name, role, access, password);
  await recordAuditLog(request.sessionUser, "owner.employee.create", username, {
    name,
    access,
  });
  response.json({
    ok: true,
    employee: {
      username,
      display_name: name,
      access_scope: access,
      role,
    },
  });
});

app.put("/api/owner/employees/:username", requireOwner, async (request, response) => {
  const username = String(request.params.username || "").trim();
  const name = String(request.body?.name || "").trim();
  const access = String(request.body?.access || "").trim();
  const password = String(request.body?.password || "");

  if (!username || !name || !["Admin", "Cashier", "Both"].includes(access)) {
    response.status(400).json({ ok: false, error: "Valid employee details are required." });
    return;
  }

  const existingResult = await pool.query(
    `
      SELECT username
      FROM app_users
      WHERE username = $1 AND role <> 'Owner'
      LIMIT 1
    `,
    [username]
  );

  if (!existingResult.rowCount) {
    response.status(404).json({ ok: false, error: "Employee not found." });
    return;
  }

  const role = access === "Admin" ? "Admin" : "Cashier";
  const updates = [name, access, role, username];
  let passwordClause = "";

  if (password) {
    if (password.length < 4) {
      response.status(400).json({ ok: false, error: "Password must be at least 4 characters." });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    updates.splice(3, 0, passwordHash);
    passwordClause = ", password_hash = $4";
  }

  await pool.query(
    `
      UPDATE app_users
      SET display_name = $1,
          access_scope = $2,
          role = $3
          ${passwordClause},
          updated_at = NOW()
      WHERE username = $${password ? 5 : 4}
    `,
    updates
  );

  await recordAuditLog(request.sessionUser, "owner.employee.update", username, {
    name,
    access,
    passwordChanged: Boolean(password),
  });

  response.json({
    ok: true,
    employee: {
      username,
      display_name: name,
      access_scope: access,
      role,
    },
  });
});

app.delete("/api/owner/employees/:username", requireOwner, async (request, response) => {
  const username = String(request.params.username || "").trim();
  if (!username) {
    response.status(400).json({ ok: false, error: "Employee username is required." });
    return;
  }

  const result = await pool.query(
    `
      DELETE FROM app_users
      WHERE username = $1 AND role <> 'Owner'
      RETURNING username
    `,
    [username]
  );

  if (!result.rowCount) {
    response.status(404).json({ ok: false, error: "Employee not found." });
    return;
  }

  await recordAuditLog(request.sessionUser, "owner.employee.delete", username, {});
  response.json({ ok: true });
});

app.post("/api/state/load-many", requireAuth, async (request, response) => {
  const defaults = request.body?.defaults || {};
  const entries = await Promise.all(
    Object.entries(defaults).map(async ([key, fallback]) => {
      let value = await getStateValue(key);
      if (value === undefined) {
        value = fallback;
        await saveStateValue(key, fallback);
      }
      return [key, value];
    })
  );

  response.json({ values: Object.fromEntries(entries) });
});

app.put("/api/state/:key", requireAuth, async (request, response) => {
  await saveStateValue(request.params.key, request.body?.value ?? null);
  await recordAuditLog(request.sessionUser, "state.update", request.params.key, {});
  response.json({ ok: true });
});

app.post("/api/orders/complete", requireAuth, async (request, response) => {
  const draft = request.body?.order;
  const outletId = normalizeOutletId(request.body?.outletId || "main");
  if (!draft || !Array.isArray(draft.items) || !draft.items.length) {
    response.status(400).json({ ok: false, error: "Order payload is required." });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const productsKey = getOutletStateKey("sweet-shop-pos:products", outletId);
    const ordersKey = getOutletStateKey("sweet-shop-pos:orders", outletId);
    const products = (await client.query("SELECT value FROM app_state WHERE key = $1", [productsKey]))
      .rows[0]?.value || [];
    const orders = (await client.query("SELECT value FROM app_state WHERE key = $1", [ordersKey]))
      .rows[0]?.value || [];

    const nextProducts = products.map((product) => {
      const soldItem = draft.items.find((item) => item.id === product.id);
      if (!soldItem) {
        return product;
      }
      if (product.stock < soldItem.quantity) {
        throw new Error(`Insufficient stock for ${product.name}.`);
      }
      return {
        ...product,
        stock: Number((product.stock - soldItem.quantity).toFixed(2)),
      };
    });

    const invoiceResult = await client.query("SELECT nextval('invoice_number_seq') AS value");
    const invoiceId = `INV-${String(invoiceResult.rows[0].value).padStart(4, "0")}`;
    const order = {
      ...draft,
      outletId,
      invoiceId,
      createdAt: new Date().toISOString(),
    };
    const nextOrders = [order, ...orders];

    await client.query(
      `
        INSERT INTO app_state (key, value, updated_at)
        VALUES ($1, $2::jsonb, NOW())
        ON CONFLICT (key)
        DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `,
      [productsKey, JSON.stringify(nextProducts)]
    );

    await client.query(
      `
        INSERT INTO app_state (key, value, updated_at)
        VALUES ($1, $2::jsonb, NOW())
        ON CONFLICT (key)
        DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `,
      [ordersKey, JSON.stringify(nextOrders)]
    );

    await client.query(
      `
        INSERT INTO audit_logs (actor_username, actor_role, action, target, details)
        VALUES ($1, $2, $3, $4, $5::jsonb)
      `,
      [
        request.sessionUser.username,
        request.sessionUser.role,
        "order.complete",
        invoiceId,
        JSON.stringify({
          total: order.total,
          paymentMethod: order.paymentMethod,
          itemCount: order.items.length,
          outletId,
        }),
      ]
    );

    await client.query("COMMIT");
    response.json({ ok: true, order, products: nextProducts, orders: nextOrders });
  } catch (error) {
    await client.query("ROLLBACK");
    response.status(400).json({ ok: false, error: error.message });
  } finally {
    client.release();
  }
});

app.get("*", (_request, response) => {
  response.sendFile(path.join(__dirname, "index.html"));
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ ok: false, error: error.message || "Unexpected server error." });
});

let backupSchedulerStarted = false;

async function startServer() {
  await ensureSchema();
  logProductionWarnings();

  return new Promise((resolve, reject) => {
    const listener = app
      .listen(PORT, HOST, () => {
        console.log(`Sweet Shop POS server running on http://localhost:${PORT}`);
        getNetworkUrls().forEach((url) => console.log(`LAN access: ${url}`));
        if (!backupSchedulerStarted) {
          scheduleAutomaticBackups();
          backupSchedulerStarted = true;
        }
        resolve(listener);
      })
      .on("error", reject);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });
}

module.exports = {
  app,
  createBackupFile,
  ensureSchema,
  startServer,
};
