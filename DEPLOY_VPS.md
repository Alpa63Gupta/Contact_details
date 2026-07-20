# Internet Hosting Guide

Use this if you want the POS reachable over the internet from anywhere.

## Recommended approach

Deploy on a VPS or cloud server with:
- Docker
- PostgreSQL
- HTTPS reverse proxy
- one public domain, for example `pos.yourdomain.com`

## Files already added for this

- [Dockerfile](C:\Users\admin\Desktop\pos\Dockerfile)
- [docker-compose.yml](C:\Users\admin\Desktop\pos\docker-compose.yml)
- [.dockerignore](C:\Users\admin\Desktop\pos\.dockerignore)

## Basic hosting flow

1. Create a Linux VPS.
2. Install Docker and Docker Compose.
3. Copy the project to the server.
4. Copy [.env.production.example](C:\Users\admin\Desktop\pos\.env.production.example) to `.env` and update the values.
5. Start the stack:

```bash
docker compose up -d --build
```

6. Put Nginx or Caddy in front of the app using [nginx.pos.conf.example](C:\Users\admin\Desktop\pos\nginx.pos.conf.example).
7. Point your domain to the VPS IP.
8. Enable HTTPS with Let’s Encrypt.

## Important environment values

For production, make sure these are set:

```env
PUBLIC_BASE_URL=https://pos.yourdomain.com
DESKTOP_APP_URL=https://pos.yourdomain.com
COOKIE_SECURE=true
TRUST_PROXY=true
```

## Desktop app connection

Once the cloud URL is live, build the Electron installer with:

```powershell
npm.cmd run desktop:build
```

The desktop software will then open the cloud POS URL instead of only `localhost` if `DESKTOP_APP_URL` is set to your public domain before the build.

## Important production notes

- do not keep `admin123` and `cashier123` for internet use
- use a strong `SESSION_SECRET`
- use HTTPS before real remote use
- back up PostgreSQL regularly

## What this gives you

- one shared server
- access from anywhere
- central database
- easier updates than installing on many machines
