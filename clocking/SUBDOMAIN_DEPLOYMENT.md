# Clocking Subdomain Deployment

Target domain:

```text
https://clocking.bridgeangelscakes.co.za
```

This folder mirrors the Employment Clocking System source into the website
GitHub repository. The clocking system is not a static-only website: `server.js`
must run on a Node.js host for `/api/*`, supervisor setup links, employee
clocking, and log storage.

Use these production environment variables on the Node server:

```env
PORT=3000
PUBLIC_BASE_URL=https://clocking.bridgeangelscakes.co.za
CLOCKING_DATA_FILE=/var/lib/employment-clocking/clock-log.json
OFFICE_TERMINAL_KEY=replace-with-a-private-office-key
```

GitHub Pages note:

```text
AshtonLG3.github.io currently uses CNAME = bridgeangelscakes.co.za.
Do not replace that root CNAME with clocking.bridgeangelscakes.co.za unless the
main cake website is intentionally moving.
```

For the subdomain to run the app, point DNS to a Node-capable host or reverse
proxy that serves this application and forwards traffic to `server.js`.
