package com.ghaule.calculator.auth

import android.app.Activity
import android.content.Context
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialCustomException
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.ktx.auth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import com.google.firebase.ktx.Firebase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.util.UUID

/**
 * Native Android Firebase Authentication and Google Credential Manager integration.
 *
 * Project: gen-lang-client-0255150793
 * Package: com.ghaule.calculator
 */
data class NativeUserProfile(
    val uid: String,
    val name: String,
    val email: String,
    val photoUrl: String?,
    val isGuest: Boolean
)

sealed class GoogleAuthResult {
    data class Success(val profile: NativeUserProfile, val idToken: String) : GoogleAuthResult()
    data class Cancelled(val message: String) : GoogleAuthResult()
    data class Error(val category: String, val code: String, val message: String, val resolution: String) : GoogleAuthResult()
}

class AndroidFirebaseAuthManager(private val context: Context) {

    private val auth: FirebaseAuth = Firebase.auth
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
    private val credentialManager: CredentialManager = CredentialManager.create(context)

    /**
     * Web Client ID from Firebase Console / Google Cloud Console (type 3).
     * Replace with your project's OAuth 2.0 Web Client ID from Firebase Console:
     * Project Settings > General > Web app / google-services.json (client_type: 3)
     */
    private val webClientId = "170188921418-web.apps.googleusercontent.com"

    fun getCurrentUser(): NativeUserProfile? {
        val user = auth.currentUser
        return if (user != null) {
            NativeUserProfile(
                uid = user.uid,
                name = user.displayName ?: "Google User",
                email = user.email ?: "",
                photoUrl = user.photoUrl?.toString(),
                isGuest = false
            )
        } else {
            null
        }
    }

    /**
     * Google Sign-In using modern Android Credential Manager (recommended by Google).
     * Bypasses unsupported WebView popups and uses Google Play Services account picker.
     */
    suspend fun signInWithGoogle(activity: Activity): GoogleAuthResult = withContext(Dispatchers.IO) {
        try {
            val googleIdOption = GetGoogleIdOption.Builder()
                .setFilterByAuthorizedAccounts(false)
                .setServerClientId(webClientId)
                .setAutoSelectEnabled(false)
                .build()

            val request = GetCredentialRequest.Builder()
                .addCredentialOption(googleIdOption)
                .build()

            val result = credentialManager.getCredential(activity, request)
            val credential = result.credential

            if (credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                val googleIdToken = GoogleIdTokenCredential.createFrom(credential.data).idToken
                val authCredential = GoogleAuthProvider.getCredential(googleIdToken, null)
                val authResult = auth.signInWithCredential(authCredential).await()
                val firebaseUser = authResult.user ?: throw Exception("Firebase authentication returned null user")

                val profile = NativeUserProfile(
                    uid = firebaseUser.uid,
                    name = firebaseUser.displayName ?: "Google User",
                    email = firebaseUser.email ?: "",
                    photoUrl = firebaseUser.photoUrl?.toString(),
                    isGuest = false
                )

                // Sync profile into Cloud Firestore: users/{uid}
                val userData = hashMapOf(
                    "uid" to profile.uid,
                    "name" to profile.name,
                    "email" to profile.email,
                    "photoURL" to (profile.photoUrl ?: ""),
                    "provider" to "google.com",
                    "lastLogin" to System.currentTimeMillis(),
                    "accountStatus" to "active"
                )
                firestore.collection("users").document(profile.uid)
                    .set(userData, SetOptions.merge())
                    .await()

                GoogleAuthResult.Success(profile, googleIdToken)
            } else {
                GoogleAuthResult.Error(
                    category = "Developer Configuration Error",
                    code = "UNSUPPORTED_CREDENTIAL",
                    message = "Received unexpected credential type: ${credential.type}",
                    resolution = "Check GoogleIdTokenCredential library configuration in build.gradle."
                )
            }
        } catch (e: GetCredentialCancellationException) {
            GoogleAuthResult.Cancelled("Google account selection was cancelled by user.")
        } catch (e: GetCredentialCustomException) {
            val msg = e.message ?: ""
            if (msg.contains("10") || msg.contains("DEVELOPER_ERROR")) {
                GoogleAuthResult.Error(
                    category = "SHA Fingerprint Mismatch",
                    code = "DEVELOPER_ERROR_10",
                    message = "SHA-1 fingerprint or Web Client ID mismatch for package com.ghaule.calculator.",
                    resolution = "Run './gradlew signingReport' and register the SHA-1 in Firebase Console for gen-lang-client-0255150793."
                )
            } else {
                GoogleAuthResult.Error(
                    category = "Authentication Error",
                    code = "CREDENTIAL_ERROR",
                    message = msg,
                    resolution = "Verify Google Play Services is up to date and try again."
                )
            }
        } catch (e: Exception) {
            val msg = e.message ?: ""
            if (msg.contains("network") || msg.contains("7")) {
                GoogleAuthResult.Error(
                    category = "Network Unavailable",
                    code = "NETWORK_ERROR",
                    message = "Unable to connect to Google servers. Device may be offline.",
                    resolution = "Check your internet connection or continue as Guest."
                )
            } else {
                GoogleAuthResult.Error(
                    category = "Firebase Authentication Failure",
                    code = "AUTH_FAILED",
                    message = msg,
                    resolution = "Ensure Google Sign-in provider is active in Firebase Console project gen-lang-client-0255150793."
                )
            }
        }
    }

    /**
     * Start local Guest session (100% offline, local-only)
     */
    fun startGuestSession(): NativeUserProfile {
        val guestId = "guest_" + UUID.randomUUID().toString()
        return NativeUserProfile(
            uid = guestId,
            name = "Guest User (अतिथि)",
            email = "guest@ghaule.local",
            photoUrl = null,
            isGuest = true
        )
    }

    /**
     * Logout:
     * - If Guest: purges local device database
     * - If Google: signs out from Firebase Auth, leaves Firestore cloud data intact
     */
    suspend fun logout(isGuest: Boolean, onPurgeGuestData: (() -> Unit)? = null) {
        if (isGuest) {
            onPurgeGuestData?.invoke()
        } else {
            auth.signOut()
            try {
                credentialManager.clearCredentialState(ClearCredentialStateRequest())
            } catch (e: Exception) {
                // Ignore clear credential failure
            }
        }
    }
}

/**
 * JavaScript Interface Bridge between Android Native and WebView.
 * Allows web app to call `window.AndroidAuth.signInWithGoogle()` seamlessly!
 */
class AndroidAuthBridge(
    private val activity: Activity,
    private val webView: WebView,
    private val authManager: AndroidFirebaseAuthManager
) {
    private val scope = CoroutineScope(Dispatchers.Main)

    @JavascriptInterface
    fun isNativeAndroid(): Boolean = true

    @JavascriptInterface
    fun signInWithGoogle() {
        scope.launch {
            val result = authManager.signInWithGoogle(activity)
            val json = JSONObject()
            when (result) {
                is GoogleAuthResult.Success -> {
                    json.put("success", true)
                    json.put("uid", result.profile.uid)
                    json.put("name", result.profile.name)
                    json.put("email", result.profile.email)
                    json.put("photoUrl", result.profile.photoUrl)
                    json.put("idToken", result.idToken)
                }
                is GoogleAuthResult.Cancelled -> {
                    json.put("success", false)
                    json.put("cancelled", true)
                    json.put("message", result.message)
                }
                is GoogleAuthResult.Error -> {
                    json.put("success", false)
                    json.put("category", result.category)
                    json.put("code", result.code)
                    json.put("message", result.message)
                    json.put("resolution", result.resolution)
                }
            }

            // Send result back to WebView JavaScript
            val script = "javascript:if(window.onAndroidGoogleSignInResult){window.onAndroidGoogleSignInResult(${json.toString()});}"
            webView.evaluateJavascript(script, null)
        }
    }
}
