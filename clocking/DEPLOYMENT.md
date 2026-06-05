# Deployment

## Hosted backend

The app is a Node.js server. For `bridgeangelscakes.co.za`, run it behind HTTPS with a reverse proxy such as Nginx or the host provider's Node app manager.

Recommended production environment:

```env
NODE_ENV=production
PORT=3000
PUBLIC_BASE_URL=https://bridgeangelscakes.co.za
OFFICE_TERMINAL_KEY=change-this-to-a-long-private-office-key
CLOCKING_DATA_FILE=/var/lib/employment-clocking/clock-log.json
```

`PUBLIC_BASE_URL` is used when the office terminal creates QR links for employee phones.

For employee phones that are not on the office LAN, `PUBLIC_BASE_URL` must be a public HTTPS address that can reach this Node server. Setup QR codes are generated as `employmentclocking://` links for the installed Android scanner app and include that public server address; the regular HTTPS setup link remains available for browser/PWA setup.

`OFFICE_TERMINAL_KEY` protects office-only actions when the backend is public, including employee registration, terminal QR creation, and manual terminal clocking. The office browser will ask for this key the first time it needs it and store it locally in that browser.

If `bridgeangelscakes.co.za` already hosts the bakery website, use a subdomain instead:

```env
PUBLIC_BASE_URL=https://clocking.bridgeangelscakes.co.za
```

Then point `clocking.bridgeangelscakes.co.za` to the server and proxy HTTPS traffic to the Node process.

## Nginx proxy example

```nginx
server {
  server_name bridgeangelscakes.co.za;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

Install an HTTPS certificate with the hosting panel or Certbot before using employee phones in production.
