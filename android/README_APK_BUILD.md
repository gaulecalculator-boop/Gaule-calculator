# GAULE CALCULATOR — Android Release APK Build Checklist

## 1. Bundle Web Assets into Android Project
Run from the repository root:
```bash
npm install
npm run build:android
```
This compiles Vite (`dist/`) and copies the production bundle into `android/app/src/main/assets/www/`.

## 2. Configure Real Firebase & Google Sign-In Credentials
Never build release APKs with placeholder credentials.
1. Generate or locate your Android release keystore:
   ```bash
   keytool -genkeypair -v -keystore android/release/gaule-release.jks -alias gaule_release -keyalg RSA -keysize 2048 -validity 10000
   keytool -list -v -keystore android/release/gaule-release.jks -alias gaule_release
   ```
2. Copy the **SHA-1** and **SHA-256** fingerprints into **Firebase Console → Project Settings (`gen-lang-client-0255150793`) → Android App (`com.ghaule.calculator`)**.
3. Enable **Play Integrity** in **Firebase Console → App Check** and link your SHA-256 certificate.
4. Download your real `google-services.json` from Firebase Console and place it at:
   `android/app/google-services.json` (see `android/app/google-services.json.template` for structure).
5. Copy `android/keystore.properties.example` → `android/keystore.properties` and enter your real keystore passwords.
6. Copy `android/local.properties.example` → `android/local.properties` and set `sdk.dir` (and `GOOGLE_WEB_CLIENT_ID` if overriding).

## 3. Build & Sign Release APK / AAB
From `/android/`:
```bash
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```
For Google Play Store bundle:
```bash
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

## 4. Real Device Verification Checklist
- Install signed `app-release.apk` via `adb install -r app-release.apk`.
- Verify native Google Sign-In dialog (Credential Manager), logout, and switching between two Google accounts with isolated local/cloud storage.
- Verify offline mode launch, airplane mode entry creation, and reconnect auto-sync (Notes, History, Customers, Byaj Ledger, Dairy Branding, Unlimited Milk Records).
- Verify WhatsApp (`wa.me`), phone dialer (`tel:`), PDF/CSV/JSON downloads (`Downloads/GauleCalculator`), system `PrintManager`, Bluetooth 58mm/80mm ESC/POS printing, and hardware Back Button navigation.
