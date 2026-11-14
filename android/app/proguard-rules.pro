# GAULE CALCULATOR R8 / ProGuard Release Rules

# Preserve JavascriptInterface classes and methods called from the WebView JS runtime
-keepattributes *Annotation*
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.ghaule.calculator.MainActivity$AndroidAppBridge { *; }
-keep class com.ghaule.calculator.auth.FirebaseAuthManager$** { *; }
-keep class com.ghaule.calculator.printer.BluetoothThermalPrinter$** { *; }
-keep class com.ghaule.calculator.auth.FirebaseAuthManager { *; }
-keep class com.ghaule.calculator.printer.BluetoothThermalPrinter { *; }

# Keep Google Credential Manager & Google Identity Services
-keep class androidx.credentials.** { *; }
-keep class com.google.android.libraries.identity.googleid.** { *; }
-dontwarn androidx.credentials.**

# Keep Firebase Auth, Firestore, App Check, and Play Integrity
-keep class com.google.firebase.appcheck.** { *; }
-keep class com.google.android.play.core.integrity.** { *; }
-keepattributes Signature,InnerClasses,EnclosingMethod

# Keep Kotlin Coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-dontwarn kotlinx.coroutines.**
