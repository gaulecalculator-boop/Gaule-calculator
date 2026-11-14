package com.ghaule.calculator

import android.app.Application
import com.google.firebase.FirebaseApp
import com.google.firebase.appcheck.FirebaseAppCheck
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreSettings
import com.google.firebase.firestore.PersistentCacheSettings

/**
 * Application bootstrap for GAULE CALCULATOR:
 * - Initializes Firebase if google-services.json has been configured.
 * - Enables Firestore offline persistent cache (unlimited local storage).
 * - Installs Firebase App Check with Play Integrity (release) or Debug provider (debug).
 */
class GauleApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        try {
            val app = FirebaseApp.initializeApp(this)
            if (app != null) {
                val settings = FirebaseFirestoreSettings.Builder()
                    .setLocalCacheSettings(
                        PersistentCacheSettings.newBuilder()
                            .setSizeBytes(FirebaseFirestoreSettings.CACHE_SIZE_UNLIMITED)
                            .build()
                    )
                    .build()
                FirebaseFirestore.getInstance().firestoreSettings = settings

                val appCheck = FirebaseAppCheck.getInstance()
                if (BuildConfig.DEBUG) {
                    try {
                        val debugFactoryClass = Class.forName(
                            "com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory"
                        )
                        val getInstance = debugFactoryClass.getMethod("getInstance")
                        val factory = getInstance.invoke(null) as com.google.firebase.appcheck.AppCheckProviderFactory
                        appCheck.installAppCheckProviderFactory(factory)
                    } catch (_: Throwable) {
                        appCheck.installAppCheckProviderFactory(
                            PlayIntegrityAppCheckProviderFactory.getInstance()
                        )
                    }
                } else {
                    appCheck.installAppCheckProviderFactory(
                        PlayIntegrityAppCheckProviderFactory.getInstance()
                    )
                }
            }
        } catch (t: Throwable) {
            // Do not crash on launch if google-services.json has not yet been placed during local inspection
        }
    }
}
