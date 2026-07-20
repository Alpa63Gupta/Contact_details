# Sweet Shop POS Installation Guide

This guide shows the easiest way to use the POS on other devices.

## Recommended setup

Use one main computer as the POS server.

- Main computer:
  Runs PostgreSQL and the POS server
- Other devices:
  Open the POS in a browser using the main computer's network address

This is better than installing the full app on every device.

## Main server computer requirements

- Windows
- Node.js installed
- PostgreSQL installed
- Project folder available at [C:\Users\admin\Desktop\pos](C:\Users\admin\Desktop\pos)

## Current app URLs

- Local: [http://localhost:3000](http://localhost:3000)
- Network: `http://10.204.47.91:3000`

Note:
- The network IP can change if your router changes it.
- If needed, check the current LAN URL from the admin dashboard or server log.

## Login

- Admin: `admin123`
- Cashier: `cashier123`

## How to use the app on another device

1. Connect the other device to the same Wi-Fi or LAN.
2. Open a browser on that device.
3. Enter the POS network URL:

```text
http://10.204.47.91:3000
```

4. Log in as Admin or Cashier.

## If you want a full installation on another Windows computer

Do this only if you really want a separate independent system.

1. Install Node.js.
2. Install PostgreSQL.
3. Copy the full project folder to the new computer.
4. Copy [.env](C:\Users\admin\Desktop\pos\.env) values to the new machine.
5. Create a PostgreSQL database:

```sql
CREATE DATABASE sweet_shop_pos;
```

6. Apply [postgres-schema.sql](C:\Users\admin\Desktop\pos\postgres-schema.sql).
7. Open PowerShell in the project folder.
8. Run:

```powershell
npm install
```

9. Start the app:

```powershell
npm start
```

10. Open:

```text
http://localhost:3000
```

## Current production setup on this machine

- Windows service installed: `Sweet Shop POS`
- App runs automatically in the background
- Automatic daily backup time is set in [.env](C:\Users\admin\Desktop\pos\.env):

```env
AUTO_DAILY_BACKUP_TIME=23:00
```

## Backup location

Backups are stored in:

- [backups](C:\Users\admin\Desktop\pos\backups)

## If the app does not open

Check these:

1. Make sure the main server computer is on.
2. Make sure the POS service is running.
3. Try the local URL on the server computer:

```text
http://localhost:3000
```

4. If local works but other devices do not work, check:
- same network
- current LAN IP
- firewall/network blocking

## How to restart the POS service

Open PowerShell as Administrator and run:

```powershell
Restart-Service -Name "sweetshoppos.exe"
```

If needed, you can also reinstall the service from the project folder:

```powershell
npm run service:uninstall
npm run service:install
```

## How to run a manual backup

From the project folder:

```powershell
npm run backup:run
```

## Future updates

If you add new features later:

- update the code on the main server computer
- restart the POS service
- refresh the browser on other devices

In the recommended setup, you only need to update one machine.
