const fs = require("fs/promises");
const path = require("path");

const DATA_DIR = path.join(__dirname, "local-data");
const DATA_FILE = path.join(DATA_DIR, "pos-db.json");

function now() {
  return new Date().toISOString();
}

function blankDb() {
  return {
    app_state: {},
    app_users: {},
    app_sessions: {},
    audit_logs: [],
    invoice_number_seq: 1,
    audit_log_seq: 1,
  };
}

function normalizeSql(sql) {
  return String(sql).replace(/\s+/g, " ").trim();
}

function parseJson(value) {
  if (typeof value !== "string") {
    return value;
  }
  return JSON.parse(value);
}

class LocalPool {
  constructor() {
    this.db = null;
    this.writeChain = Promise.resolve();
  }

  async load() {
    if (this.db) {
      return this.db;
    }
    try {
      const raw = await fs.readFile(DATA_FILE, "utf8");
      this.db = { ...blankDb(), ...JSON.parse(raw) };
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
      this.db = blankDb();
      await this.save();
    }
    return this.db;
  }

  async save() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(this.db, null, 2));
  }

  async mutate(fn) {
    this.writeChain = this.writeChain.then(async () => {
      await this.load();
      const result = await fn(this.db);
      await this.save();
      return result;
    });
    return this.writeChain;
  }

  async query(sql, params = []) {
    const text = normalizeSql(sql);
    const lower = text.toLowerCase();

    if (
      lower.startsWith("create ") ||
      lower.startsWith("alter ") ||
      lower === "begin" ||
      lower === "commit" ||
      lower === "rollback" ||
      lower === "select 1"
    ) {
      await this.load();
      return { rows: [], rowCount: 0 };
    }

    if (lower.includes("select nextval('invoice_number_seq')")) {
      return this.mutate((db) => {
        const value = db.invoice_number_seq++;
        return { rows: [{ value }], rowCount: 1 };
      });
    }

    if (lower.startsWith("insert into app_state")) {
      return this.mutate((db) => {
        const [key, value] = params;
        db.app_state[key] = {
          key,
          value: parseJson(value),
          updated_at: now(),
        };
        return { rows: [], rowCount: 1 };
      });
    }

    if (lower.startsWith("select value from app_state")) {
      const db = await this.load();
      const row = db.app_state[params[0]];
      return { rows: row ? [{ value: row.value }] : [], rowCount: row ? 1 : 0 };
    }

    if (lower.startsWith("insert into audit_logs")) {
      return this.mutate((db) => {
        const [actor_username, actor_role, action, target, details] = params;
        db.audit_logs.push({
          id: db.audit_log_seq++,
          actor_username,
          actor_role,
          action,
          target,
          details: parseJson(details),
          created_at: now(),
        });
        return { rows: [], rowCount: 1 };
      });
    }

    if (lower.includes("from audit_logs")) {
      const db = await this.load();
      const rows = [...db.audit_logs].sort((a, b) => b.id - a.id).slice(0, 30);
      return { rows, rowCount: rows.length };
    }

    if (lower.startsWith("insert into app_sessions")) {
      return this.mutate((db) => {
        const [token, username, role] = params;
        db.app_sessions[token] = {
          token,
          username,
          role,
          created_at: now(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };
        return { rows: [], rowCount: 1 };
      });
    }

    if (lower.startsWith("select token, username, role from app_sessions")) {
      const db = await this.load();
      const session = db.app_sessions[params[0]];
      const valid = session && new Date(session.expires_at).getTime() > Date.now();
      return { rows: valid ? [session] : [], rowCount: valid ? 1 : 0 };
    }

    if (lower.includes("from app_sessions sessions join app_users users")) {
      const db = await this.load();
      const session = db.app_sessions[params[0]];
      const user = session ? db.app_users[session.username] : null;
      const valid = session && user && new Date(session.expires_at).getTime() > Date.now();
      return {
        rows: valid
          ? [
              {
                token: session.token,
                username: session.username,
                role: session.role,
                display_name: user.display_name,
                access_scope: user.access_scope,
              },
            ]
          : [],
        rowCount: valid ? 1 : 0,
      };
    }

    if (lower.startsWith("delete from app_sessions")) {
      return this.mutate((db) => {
        const existed = Boolean(db.app_sessions[params[0]]);
        delete db.app_sessions[params[0]];
        return { rows: [], rowCount: existed ? 1 : 0 };
      });
    }

    if (lower.startsWith("insert into app_users")) {
      return this.mutate((db) => {
        const [username, display_name, role, access_scope, password_hash] = params;
        if (lower.includes("do nothing") && db.app_users[username]) {
          return { rows: [], rowCount: 0 };
        }
        db.app_users[username] = {
          username,
          display_name,
          role,
          access_scope,
          password_hash,
          updated_at: now(),
        };
        return { rows: [], rowCount: 1 };
      });
    }

    if (lower.includes("from app_users where username = 'owner'")) {
      const db = await this.load();
      const owner = db.app_users.owner;
      return { rows: owner ? [owner] : [], rowCount: owner ? 1 : 0 };
    }

    if (lower.includes("from app_users where role <> 'owner' and access_scope in")) {
      const db = await this.load();
      const role = params[0];
      const rows = Object.values(db.app_users).filter(
        (user) => user.role !== "Owner" && [role, "Both"].includes(user.access_scope)
      );
      return { rows, rowCount: rows.length };
    }

    if (lower.includes("from app_users where role <> 'owner' order by updated_at desc")) {
      const db = await this.load();
      const rows = Object.values(db.app_users)
        .filter((user) => user.role !== "Owner")
        .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
      return { rows, rowCount: rows.length };
    }

    if (lower.includes("from app_users where username = $1 and role <> 'owner'")) {
      const db = await this.load();
      const user = db.app_users[params[0]];
      const rows = user && user.role !== "Owner" ? [{ username: user.username }] : [];
      return { rows, rowCount: rows.length };
    }

    if (lower.startsWith("update app_users")) {
      return this.mutate((db) => {
        const hasPassword = params.length === 5;
        const username = params[hasPassword ? 4 : 3];
        const user = db.app_users[username];
        if (!user) {
          return { rows: [], rowCount: 0 };
        }
        user.display_name = params[0];
        user.access_scope = params[1];
        user.role = params[2];
        if (hasPassword) {
          user.password_hash = params[3];
        }
        user.updated_at = now();
        return { rows: [], rowCount: 1 };
      });
    }

    if (lower.startsWith("delete from app_users")) {
      return this.mutate((db) => {
        const user = db.app_users[params[0]];
        if (!user || user.role === "Owner") {
          return { rows: [], rowCount: 0 };
        }
        delete db.app_users[params[0]];
        return { rows: [{ username: params[0] }], rowCount: 1 };
      });
    }

    throw new Error(`Unsupported local database query: ${text}`);
  }

  async connect() {
    return {
      query: (sql, params) => this.query(sql, params),
      release: () => {},
    };
  }
}

module.exports = {
  Pool: LocalPool,
};
