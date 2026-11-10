# 1Dev Client Planner

A private, mobile-friendly appointment dashboard for Mwathi Dennis. Built with Node.js and plain HTML/CSS/JavaScript, with no external packages or build step.

## Included

- Password login with HTTP-only session cookies, login rate limiting and origin checks.
- Create, view, edit, reschedule, complete, cancel and delete appointments.
- Client name/phone, project, purpose, date/time, location/link, meeting notes and follow-up date.
- Dashboard totals, searchable appointment list, project/status/date filters, monthly calendar and due follow-ups.
- Custom project names with suggestions for Elimu, Abide, KaitiOS, TradeLens and Mbesa Car Imports.
- Server-side persistence with atomic file replacement; JSON backup download.
- Kenya appointment timezone: Africa/Nairobi (EAT, UTC+3).

## Codespaces / local

Use Node 22 or later. No npm install is needed.

```bash
read -rs -p 'Choose a planner password (20+ characters): ' PLANNER_PASSWORD
export PLANNER_PASSWORD
npm start
```

Open port **3000** from Codespaces' Ports panel. Sign in with the password you entered. Keep the forwarded port private. To change port: `PORT=3001 npm start`.

`npm test` checks validation, authentication, CRUD, cross-origin rejection and persistence across server restarts.

## cPanel Node.js app

1. Upload/clone this repository outside your public web directory.
2. Create a Node.js application using Node 22+; set the application root to the repository and startup file to `server.mjs`.
3. Set environment variables: `PLANNER_PASSWORD` (unique, 20+ characters), `NODE_ENV=production`, `COOKIE_SECURE=true` (HTTPS), and `DATA_DIR` to a writable private directory outside the public web root.
4. Enable HTTPS for the application domain and restart the application.
5. Visit the application URL and sign in.

The host must support an ES module startup file. If its Passenger configuration only supports CommonJS, ask the host to enable a compatible Node startup configuration or use Render.

## Render web service

- Runtime: Node, Node version 22 or later.
- Build command: `npm install --omit=dev` (there are no dependencies).
- Start command: `npm start`.
- Environment: `PLANNER_PASSWORD`, `COOKIE_SECURE=true`, `NODE_ENV=production`.
- Health check: `/health`.
- **Attach a persistent disk** mounted at `/var/data` and set `DATA_DIR=/var/data/planner` before saving real appointments. Ephemeral service files can disappear on redeploy/restart. Render persistent disks may require a paid service; cPanel with persistent storage is an alternative.

## Data and limits

Data is stored in `DATA_DIR/appointments.json` (defaults to `data/appointments.json`). This is a single-user planner designed for one running server process. Do not run multiple replicas against the same JSON file. Back up this file regularly; the dashboard can also download a JSON backup. To restore, stop the server, replace the data file with the backup's `appointments` array, then restart. Never commit client data or passwords to GitHub.

Sessions expire after 24 hours and are cleared on server restart. A shared password grants full access. Follow-up badges update when the page refreshes or you change a view; follow-ups remain due until you clear or move their date. Completed appointments may still have an outstanding follow-up.

Automatic SMS/email/WhatsApp reminders, cross-device offline sync and Google Calendar sync are not connected. The planner needs its server to be online; data saved on that server is available when you sign in from another device.

Powered by 1Dev.co.
