# Native Employee Scanner Plan

The employee scanner now has two install paths:

- **PWA mode:** the phone opens `/mobile` from the office terminal server and can be installed from the browser.
- **Native mode:** Capacitor wraps the same `/public` scanner UI into Android/iOS projects so the app can use native camera scanning and haptics.

## Current Native Flow

1. Office registers an employee and issues a setup QR/link.
2. Native app opens blank and scans the office setup QR.
3. App saves the office server address from the scanned QR.
4. Employee reviews the issued details and confirms.
5. App locks into the scanner card.
6. For daily clocking, employee scans the terminal QR from inside the native app.
7. Backend decides whether the scan is `IN` or `OUT`.

## Build Notes

- Android project lives in `android/`.
- iOS project lives in `ios/` and requires macOS/Xcode for final build.
- Android HTTP LAN access is intentionally allowed because the local office server currently runs on `http://<LAN-IP>:3000`.
- iOS camera, local network, and HTTP transport descriptions are configured in `ios/App/App/Info.plist`.

## Verification

Run:

```powershell
npm test
npm run cap:sync:android
npm run android:debug
```

The Android build may need Android Studio's bundled JBR/JDK if the system Java version is too new for the Gradle version in use.
