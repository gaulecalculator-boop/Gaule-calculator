package com.ghaule.calculator

import android.Manifest
import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.ActivityNotFoundException
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.print.PrintAttributes
import android.print.PrintManager
import android.provider.MediaStore
import android.util.Base64
import android.webkit.DownloadListener
import android.webkit.JavascriptInterface
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader
import com.ghaule.calculator.auth.FirebaseAuthManager
import com.ghaule.calculator.printer.BluetoothThermalPrinter
import com.google.android.play.core.integrity.IntegrityManagerFactory
import com.google.android.play.core.integrity.IntegrityTokenRequest
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream

/**
 * MainActivity hosting GAULE CALCULATOR bundled in assets/www via WebViewAssetLoader:
 * - Serves offline bundle securely over https://appassets.androidplatform.net/assets/www/index.html
 * - Routes WhatsApp (wa.me), tel:, mailto:, and external URLs to native Intents
 * - Saves PDF, CSV, JSON, PNG downloads directly to Downloads/GauleCalculator via MediaStore
 * - Handles Android PrintManager HTML/document printing
 * - Integrates Credential Manager Google Sign-In, Bluetooth ESC/POS printing, Play Integrity & Back Button
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var authManager: FirebaseAuthManager
    private lateinit var thermalPrinter: BluetoothThermalPrinter
    private var printWebView: WebView? = null
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private var lastBackPressedMs: Long = 0L

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val uris = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
        fileUploadCallback?.onReceiveValue(uris)
        fileUploadCallback = null
    }

    private val bluetoothPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { _ ->
        // Permission response handled; JS caller can re-query paired printers
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            @Suppress("DEPRECATION")
            databaseEnabled = true
            allowFileAccess = false
            allowContentAccess = true
            useWideViewPort = true
            loadWithOverviewMode = true
            builtInZoomControls = false
            displayZoomControls = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            mediaPlaybackRequiresUserGesture = false
        }

        authManager = FirebaseAuthManager(this, webView)
        thermalPrinter = BluetoothThermalPrinter(this) {
            requestBluetoothPermissions()
        }

        webView.addJavascriptInterface(authManager, "AndroidAuth")
        webView.addJavascriptInterface(AndroidAppBridge(), "AndroidApp")
        webView.addJavascriptInterface(thermalPrinter, "AndroidThermalPrinter")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                val url = request.url.toString()
                val host = request.url.host ?: ""
                if (host == "appassets.androidplatform.net") {
                    return false
                }
                return handleExternalIntentUrl(url)
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback
                return try {
                    val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "*/*"
                    }
                    fileChooserLauncher.launch(intent)
                    true
                } catch (_: Throwable) {
                    fileUploadCallback = null
                    false
                }
            }
        }

        webView.setDownloadListener(DownloadListener { url, _, contentDisposition, mimeType, _ ->
            if (url.startsWith("http://") || url.startsWith("https://")) {
                try {
                    val fileName = URLUtil.guessFileName(url, contentDisposition, mimeType)
                    val req = DownloadManager.Request(Uri.parse(url)).apply {
                        setMimeType(mimeType)
                        setTitle(fileName)
                        setDescription("Downloading $fileName")
                        setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                        setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
                    }
                    val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                    dm.enqueue(req)
                    Toast.makeText(this, "Downloading $fileName", Toast.LENGTH_SHORT).show()
                } catch (_: Throwable) {
                    handleExternalIntentUrl(url)
                }
            }
        })

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                webView.evaluateJavascript(
                    "(function(){ return Boolean(window.__ghauleHandleBackPress && window.__ghauleHandleBackPress()); })()"
                ) { result ->
                    val handledByApp = result == "true"
                    if (!handledByApp) {
                        if (webView.canGoBack()) {
                            webView.goBack()
                        } else {
                            val now = System.currentTimeMillis()
                            if (now - lastBackPressedMs < 2000L) {
                                isEnabled = false
                                onBackPressedDispatcher.onBackPressed()
                            } else {
                                lastBackPressedMs = now
                                Toast.makeText(
                                    this@MainActivity,
                                    "Press back again to exit GAULE CALCULATOR",
                                    Toast.LENGTH_SHORT
                                ).show()
                            }
                        }
                    }
                }
            }
        })

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
        } else {
            webView.loadUrl("https://appassets.androidplatform.net/assets/www/index.html")
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    private fun requestBluetoothPermissions() {
        runOnUiThread {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                bluetoothPermissionLauncher.launch(
                    arrayOf(
                        Manifest.permission.BLUETOOTH_CONNECT,
                        Manifest.permission.BLUETOOTH_SCAN
                    )
                )
            } else {
                bluetoothPermissionLauncher.launch(arrayOf(Manifest.permission.BLUETOOTH))
            }
        }
    }

    private fun handleExternalIntentUrl(url: String): Boolean {
        return try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
            true
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(this, "No app installed to open link", Toast.LENGTH_SHORT).show()
            false
        } catch (_: Throwable) {
            false
        }
    }

    private fun saveBase64FileToDownloads(base64Data: String, filename: String, mimeType: String): Boolean {
        return try {
            val cleanBase64 = if (base64Data.contains(",")) base64Data.substringAfter(",") else base64Data
            val bytes = Base64.decode(cleanBase64, Base64.DEFAULT)
            val safeName = filename.replace(Regex("[^a-zA-Z0-9._-]"), "_")

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val values = ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, safeName)
                    put(MediaStore.Downloads.MIME_TYPE, mimeType)
                    put(MediaStore.Downloads.RELATIVE_PATH, "${Environment.DIRECTORY_DOWNLOADS}/GauleCalculator")
                    put(MediaStore.Downloads.IS_PENDING, 1)
                }
                val resolver = contentResolver
                val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values) ?: return false
                resolver.openOutputStream(uri)?.use { out ->
                    out.write(bytes)
                }
                values.clear()
                values.put(MediaStore.Downloads.IS_PENDING, 0)
                resolver.update(uri, values, null, null)
            } else {
                @Suppress("DEPRECATION")
                val dir = File(
                    Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
                    "GauleCalculator"
                )
                if (!dir.exists()) dir.mkdirs()
                val file = File(dir, safeName)
                FileOutputStream(file).use { out -> out.write(bytes) }
            }

            runOnUiThread {
                Toast.makeText(this, "Saved to Downloads/GauleCalculator/$safeName", Toast.LENGTH_LONG).show()
            }
            true
        } catch (t: Throwable) {
            runOnUiThread {
                Toast.makeText(this, "Save failed: ${t.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
            false
        }
    }

    private fun printHtmlViaPrintManager(html: String, jobName: String) {
        runOnUiThread {
            val pwv = WebView(this)
            pwv.webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView, url: String) {
                    val printManager = getSystemService(Context.PRINT_SERVICE) as PrintManager
                    val adapter = view.createPrintDocumentAdapter(jobName.ifBlank { "Gaule Calculator Bill" })
                    printManager.print(
                        jobName.ifBlank { "Gaule Calculator Bill" },
                        adapter,
                        PrintAttributes.Builder().build()
                    )
                    printWebView = null
                }
            }
            printWebView = pwv
            pwv.loadDataWithBaseURL("https://appassets.androidplatform.net/assets/www/", html, "text/html", "UTF-8", null)
        }
    }

    inner class AndroidAppBridge {

        @JavascriptInterface
        fun openExternalUrl(url: String): Boolean {
            var handled = false
            runOnUiThread {
                handled = handleExternalIntentUrl(url)
            }
            return true
        }

        @JavascriptInterface
        fun saveFileBase64(base64Data: String, filename: String, mimeType: String): Boolean {
            return saveBase64FileToDownloads(base64Data, filename, mimeType)
        }

        @JavascriptInterface
        fun printHtml(html: String, jobName: String) {
            printHtmlViaPrintManager(html, jobName)
        }

        @JavascriptInterface
        fun getAppVersion(): String = "${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})"

        @JavascriptInterface
        fun requestPlayIntegrityToken(nonce: String) {
            val integrityManager = IntegrityManagerFactory.create(this@MainActivity)
            val req = IntegrityTokenRequest.builder()
                .setNonce(nonce)
                .build()
            integrityManager.requestIntegrityToken(req)
                .addOnSuccessListener { response ->
                    val json = JSONObject().apply {
                        put("success", true)
                        put("token", response.token())
                    }
                    val escaped = JSONObject.quote(json.toString())
                    webView.post {
                        webView.evaluateJavascript(
                            "if (window.onPlayIntegrityResult) { window.onPlayIntegrityResult(JSON.parse($escaped)); }",
                            null
                        )
                    }
                }
                .addOnFailureListener { e ->
                    val json = JSONObject().apply {
                        put("success", false)
                        put("error", e.localizedMessage ?: "Play Integrity request failed")
                    }
                    val escaped = JSONObject.quote(json.toString())
                    webView.post {
                        webView.evaluateJavascript(
                            "if (window.onPlayIntegrityResult) { window.onPlayIntegrityResult(JSON.parse($escaped)); }",
                            null
                        )
                    }
                }
        }
    }
}
