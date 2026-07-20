# Remote Access Guide

Use this when another device is far away and needs to access the same live POS safely.

## Best option: Tailscale

Tailscale creates a secure private network between your computers without exposing the POS directly to the public internet.

## What to install

Install Tailscale on:
- the main POS server computer
- the far-away computer, phone, or tablet

## Steps

1. Install Tailscale on both devices.
2. Sign in with the same Tailscale account on both devices.
3. On the POS server computer, make sure the POS is running.
4. In Tailscale, note the server device IP or machine name.
5. On the far-away device, open the browser and use:

```text
http://<tailscale-ip>:3000
```

or

```text
http://<tailscale-device-name>:3000
```

## Why this is the recommended remote option

- safer than opening your router port directly
- keeps the app private
- easy to use from another city or another branch
- works with the same live server and database

## Important before remote use

- change simple passwords
- keep the server computer powered on
- keep PostgreSQL and the POS service running

## If remote access does not work

1. Check that Tailscale is connected on both devices.
2. Check that the POS opens locally on the server:
   [http://localhost:3000](http://localhost:3000)
3. Check that Windows firewall is not blocking port `3000`.
4. Restart the POS service if needed.
