# Sweet Shop POS Quick Start

## To use on this computer

1. Open a browser.
2. Go to [http://localhost:3000](http://localhost:3000)
3. Login:
   - Admin: `admin123`
   - Cashier: `cashier123`

## To use on another device

1. Connect the device to the same Wi-Fi or network.
2. Open a browser.
3. Go to:

```text
http://10.204.47.91:3000
```

4. Login:
   - Admin: `admin123`
   - Cashier: `cashier123`

## If the app does not open

1. Check that the main computer is on.
2. Try opening [http://localhost:3000](http://localhost:3000) on the main computer.
3. If it works on the main computer but not on another device, make sure both are on the same network.

## Restart the app

Open PowerShell as Administrator and run:

```powershell
Restart-Service -Name "sweetshoppos.exe"
```

## Backup location

Backups are stored in:

- [backups](C:\Users\admin\Desktop\pos\backups)
