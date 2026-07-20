# Sweet Shop POS

This POS now supports a real shared-data path using `Node.js + PostgreSQL`. Shared shop data is stored in PostgreSQL, while device-local UI state such as the open cart stays local to each counter.

## What is shared in real time

- products
- orders
- expenses
- stock transfer requests

## What stays local per device

- current cart
- customer name field
- search text
- tax, discount, and current payment selection

## Backend auth

- Admin and Cashier login now go through the backend.
- The server seeds two users on startup:
  - `admin` with role `Admin`
  - `cashier` with role `Cashier`
- Passwords come from environment variables, not frontend code.

## Database-backed invoice numbering

- Completed sales now receive invoice numbers from PostgreSQL sequence `invoice_number_seq`.
- This avoids duplicate invoice IDs across multiple counters.

## Audit logs

- Admin actions and data-changing operations are written to `audit_logs`.
- The admin UI no longer shows the audit list, but the backend still records the history.
- Current logged events include login/logout, database backup/restore, shared state updates, and completed orders.

## Prerequisites

- Node.js 20+
- PostgreSQL 14+

## Database setup

Create a database:

```sql
CREATE DATABASE sweet_shop_pos;
```

Apply the schema from [postgres-schema.sql](C:\Users\admin\Desktop\pos\postgres-schema.sql).

## Environment

Copy values from [.env.example](C:\Users\admin\Desktop\pos\.env.example).

Expected variables:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sweet_shop_pos
SESSION_SECRET=change-this-session-secret
ADMIN_PASSWORD=admin123
CASHIER_PASSWORD=cashier123
PG_BIN_DIR=C:\Program Files\PostgreSQL\16\bin
BACKUP_RETENTION_DAYS=14
AUTO_DAILY_BACKUP_TIME=23:00
PUBLIC_BASE_URL=http://localhost:3000
DESKTOP_APP_URL=http://localhost:3000
COOKIE_SECURE=false
TRUST_PROXY=false
```

## Run

Install dependencies:

```powershell
npm install
```

Start the server:

```powershell
npm start
```

Open:

```text
http://localhost:3000
```

To use it across multiple shop devices, run the server on one machine in the same network and open that machine's LAN IP from the other terminals.

The admin dashboard also shows the LAN URLs detected by the server.

## Backup and restore

- Admin can download a SQL backup from the dashboard.
- Admin can restore a SQL backup from the dashboard.
- Backup files are also stored in the local `backups` directory when created on the server.

## Run as a Windows service

Install the service:

```powershell
npm run service:install
```

Remove the service:

```powershell
npm run service:uninstall
```

This uses `node-windows`, so the POS server starts automatically with Windows and keeps running in the background.

## Automatic daily backups

Run a manual backup:

```powershell
npm run backup:run
```

The running POS server can create an automatic backup every day. Set the time in [.env](C:\Users\admin\Desktop\pos\.env):

```env
AUTO_DAILY_BACKUP_TIME=23:00
```

If you still want a Windows scheduled task, use the helper script below when your Windows session has permission to create tasks.

Install a scheduled backup task for 11:00 PM every day:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-backup-task.ps1
```

Install it for a custom time:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-backup-task.ps1 SweetShopPOSDailyBackup 21:30
```

Remove the scheduled task:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall-backup-task.ps1
```

Backups are written to [backups](C:\Users\admin\Desktop\pos\backups) and files older than `BACKUP_RETENTION_DAYS` are cleaned up automatically.

## Receipt printing

- The billing receipt is tuned for 80mm thermal paper.
- Printing hides the rest of the app and prints only the open receipt dialog.
- The receipt keeps invoice, customer, payment, and totals in a compact format suitable for counter printers.

## Windows desktop app

You can run the POS as a desktop software using Electron.

Development desktop mode:

```powershell
npm run desktop:dev
```

Build a Windows installer:

```powershell
npm run desktop:build
```

The installer output is written to the local `dist` folder.

For a cloud/shared deployment, set `DESKTOP_APP_URL` to your public POS domain before building so the installed desktop app connects to the same live server for every user.

## Remote and internet use

- Safe remote access guide: [REMOTE_ACCESS.md](C:\Users\admin\Desktop\pos\REMOTE_ACCESS.md)
- Internet hosting guide: [DEPLOY_VPS.md](C:\Users\admin\Desktop\pos\DEPLOY_VPS.md)
- Release package command for another device:

```powershell
npm run package:release
```

This creates a zip package inside the local `release` folder that you can copy to another machine.

## Next sensible upgrades

1. Add HTTPS plus reverse-proxy deployment for access beyond the local network.
2. Add password-change controls inside the admin dashboard.
3. Add printer-specific logo/header customization for your exact receipt paper and brand.
