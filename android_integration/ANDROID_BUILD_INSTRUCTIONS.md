# Ghaule Calculator Android APK & Google Sign-In Integration Guide

This guide describes how to configure, diagnose, and build the native Android APK (`.apk` / `.aab`) for **Ghaule Calculator** with Google Login & Cloud Firestore synchronization.

---

## 1. Firebase Project & Authentication Credentials

- **Firebase Project ID**: `gen-lang-client-0255150793`
- **Application Package**: `com.ghaule.calculator`
- **Authentication Provider**: Google (`google.com`)
- **Web Client ID (Type 3)**: Copy from Firebase Console > Project Settings > General > Web apps (or Google Cloud Credentials).
- **Firestore DB**: `(default)` in region `asia-southeast1`

---

## 2. Generating and Registering SHA-1 and SHA-256 Fingerprints

For Google Sign-In to work on real Android devices (without throwing `10: DEVELOPER_ERROR`), your keystore certificate fingerprints (SHA-1 & SHA-256) **MUST** be registered in the Firebase Console:

### Step 1: Run signingReport in Android Studio terminal
```bash
./gradlew signingReport
```

Or via `keytool` for your debug keystore:
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

For release keystore:
```bash
keytool -list -v -keystore /path/to/your-release-key.jks -alias your-key-alias
```

Example Output:
```text
Variant: debug
Config: debug
Store: ~/.android/debug.keystore
Alias: androiddebugkey
SHA1: 28:00:01:52:00:99:AA:BB:CC:...
SHA-256: 83:7D:A3:7A:...
```

### Step 2: Add Fingerprints in Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/) -> Select project **`gen-lang-client-0255150793`**.
2. Click the **Project Settings** (gear icon) -> **General**.
3. Scroll down to **Your apps** -> Select the Android app with package **`com.ghaule.calculator`**.
   *(If not added yet, click "Add app" > Android > Package: `com.ghaule.calculator`).*
4. Click **Add fingerprint**, paste your **SHA-1** fingerprint and save.
5. Click **Add fingerprint** again, paste your **SHA-256** fingerprint and save.
6. Download the generated `google-services.json` and place it in `app/google-services.json`.

---

## 3. Web Client ID Verification

1. In Firebase Console, go to **Authentication** > **Sign-in method** > **Google**.
2. Expand the Google provider and copy the **Web SDK configuration > Web client ID** (format: `170188921418-xxxxxxxx.apps.googleusercontent.com`).
3. Ensure this Web Client ID is used in `FirebaseAuthManager.kt` (`webClientId`) and `google-services.json` (`client_type: 3`).

---

## 4. Modern Android Architecture (Credential Manager)

Google deprecated the legacy GoogleSignInClient (`play-services-auth:20.x`). Ghaule Calculator uses the official **Android Credential Manager API** (`androidx.credentials`) supported on Android 14+ and backported to Android 4.4+.

### Required Dependencies (`app/build.gradle.kts`):
```kotlin
dependencies {
    // Firebase BoM
    implementation(platform("com.google.firebase:firebase-bom:33.8.0"))
    implementation("com.google.firebase:firebase-auth-ktx")
    implementation("com.google.firebase:firebase-firestore-ktx")

    // Android Credential Manager for Google Sign-In
    implementation("androidx.credentials:credentials:1.3.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.3.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")

    // Room Database for 100% offline local cache
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
}
```

---

## 5. WebView + Native Android Auth Bridge

If compiling the app as an Android WebView wrapper APK:
In your `MainActivity.kt`:
```kotlin
val authManager = AndroidFirebaseAuthManager(this)
val authBridge = AndroidAuthBridge(this, binding.webView, authManager)

binding.webView.settings.javaScriptEnabled = true
binding.webView.settings.domStorageEnabled = true
binding.webView.addJavascriptInterface(authBridge, "AndroidAuth")
```
When user taps **"Continue with Google"**, the app invokes `window.AndroidAuth.signInWithGoogle()`, launching the native Android system account chooser!

---

## 6. Building the APK

### Build Debug APK:
```bash
./gradlew assembleDebug
```
Output: `app/build/outputs/apk/debug/app-debug.apk`

### Build Signed Release APK:
```bash
./gradlew assembleRelease
```
Output: `app/build/outputs/apk/release/app-release.apk`

---

## 7. Progressive Web App (PWA) Standalone Mode

In addition to native APK builds, Ghaule Calculator is a full Progressive Web App:
1. Open the app in Android Chrome.
2. Tap the browser menu (⋮) -> **Install app** or **Add to Home screen**.
3. The app installs with its icon, splash screen, and offline service worker caching all 28+ calculation tools.
