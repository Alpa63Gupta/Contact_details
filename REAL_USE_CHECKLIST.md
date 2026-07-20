# Ramesh Sweets POS Real Use Checklist

Use this before running the POS for daily billing.

## Must Do

1. Change all passwords in `.env`.
2. Change `SESSION_SECRET` to a long random value.
3. Keep `RESET_DEFAULT_USERS=false` after first setup so passwords are not reset on restart.
4. Run a backup daily. Manual backup command:

```powershell
npm run backup:run
```

5. Confirm the backup file appears in `backups/`.
6. Keep one copy of backups outside this computer.

## Multi Outlet

- Owner/Admin can create and switch outlets from the dashboard.
- Cashier selects the outlet on the login page.
- Stock, orders, expenses and transfers are outlet-wise.
- Ledger, employee profiles and attendance are company-wide.

## Production Server

Use `.env.production.example` as the template. For HTTPS/domain use:

```env
COOKIE_SECURE=true
TRUST_PROXY=true
PUBLIC_BASE_URL=https://your-domain.example
```

## Important

Default passwords are only for testing. Do not use them in a real shop.
