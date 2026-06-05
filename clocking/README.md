# Employment Clocking System

A small office-and-terminal clocking system for recording when employees arrive at work and when they go off duty.

The system has three roles:

- **Office/backend:** keeps the central attendance ledger and accrues worked hours.
- **Host terminal:** acts like the check point. It creates short-lived QR tokens and accepts card, tag, or NFC-style credential scans.
- **Employee scanner:** the office issues a personalized phone scanner setup link/QR to a blank phone app. The employee reviews or corrects the office-issued details once, confirms them, and the app locks into a plain scanner card showing the employee number and the next office-controlled action: **IN** or **OUT**. When the employee scans the terminal QR, the backend decides the action from the central ledger, records the event, then the phone vibrates or chimes if the device allows it.

## Run

```powershell
npm start
```

Then open `http://localhost:3000`.

The office terminal shows a short-lived QR code for the employee scanner. Employees scan it from their phones at the terminal and submit a scan to the same central log. The phone does not manually toggle IN or OUT; the backend decides whether the scan means clock in or clock out. Unknown employees or unknown credentials are rejected.

The terminal also accepts card, tag, or NFC IDs that the office has already registered. Each scan uses the credential ID alone, and the backend decides whether that scan is IN or OUT.

## Supervisor Check Point

The supervisor app at `/supervisor` is a limited standalone field terminal. It captures the supervisor phone location, generates a short-lived Check Point QR, and employees scan that QR with their issued employee app exactly like the fixed terminal QR. The employee app does not display the terminal name; the backend records which supervisor device generated the QR and where it was generated.

Supervisors can also record a manual clock-in/out or flag an employee for office review. Those actions require a fresh GPS location and appear in the backend supervisor activity feed.

## Install On A Phone

The employee scanner is installable as a PWA from the phone browser.

1. Keep the clocking server running on the terminal computer.
2. Open the terminal dashboard at `http://localhost:3000`.
3. Register the employee in the office form.
4. Scan the office-issued employee scanner setup QR/link with that person's phone once.
5. On Android Chrome, use the browser menu and choose **Install app**.
6. On iPhone Safari, use Share and choose **Add to Home Screen**.
7. For daily clocking, scan the terminal Check Point QR. The phone shows IN before a clock-in scan and OUT before a clock-out scan.

## Native Android App

The employee scanner can also be wrapped as a native Capacitor app. In native mode the app starts blank, then uses its own camera scanner to read either the office setup QR or the terminal QR. The first scanned QR teaches the app the office server address, so it can call the backend from `capacitor://localhost`.

For local testing, the backend computer and phone must be on the same network. For real employee use over mobile data or any Wi-Fi, run the backend behind HTTPS and set `PUBLIC_BASE_URL` to that public address before issuing setup QR codes or links. Setup QR codes open the installed scanner app through the `employmentclocking://` app link, while the HTTPS setup link remains available as a browser/PWA fallback.

```powershell
npm run cap:sync:android
npm run android:debug
```

The debug APK is written under `android/app/build/outputs/apk/debug/`. The backend server must stay running.

## Test

```powershell
npm test
```

## Data

Clocking entries and credential links are stored by the server in `data/clock-log.json`. The file is ignored by Git so live employee attendance data is not committed.
