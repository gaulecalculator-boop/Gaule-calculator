package com.ghaule.calculator.printer

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Base64
import android.webkit.JavascriptInterface
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.UUID

/**
 * Native Bluetooth SPP ESC/POS Thermal Printer Bridge for 58mm & 80mm printers.
 * Exposed to JavaScript as window.AndroidThermalPrinter.
 */
class BluetoothThermalPrinter(
    private val context: Context,
    private val onRequestBluetoothPermission: (() -> Unit)? = null
) {
    companion object {
        private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    }

    private fun getBluetoothAdapter(): BluetoothAdapter? {
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        return manager?.adapter ?: @Suppress("DEPRECATION") BluetoothAdapter.getDefaultAdapter()
    }

    private fun hasConnectPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.BLUETOOTH_CONNECT
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.BLUETOOTH
            ) == PackageManager.PERMISSION_GRANTED
        }
    }

    @JavascriptInterface
    fun isSupported(): Boolean = getBluetoothAdapter() != null

    @SuppressLint("MissingPermission")
    @JavascriptInterface
    fun getPairedPrintersJson(): String {
        val adapter = getBluetoothAdapter() ?: return "[]"
        if (!hasConnectPermission()) {
            onRequestBluetoothPermission?.invoke()
            return "[]"
        }

        return try {
            val bonded: Set<BluetoothDevice> = adapter.bondedDevices ?: emptySet()
            val arr = JSONArray()
            for (dev in bonded) {
                arr.put(
                    JSONObject().apply {
                        put("name", dev.name ?: "Bluetooth Printer")
                        put("address", dev.address ?: "")
                        put("bonded", true)
                    }
                )
            }
            arr.toString()
        } catch (_: Throwable) {
            "[]"
        }
    }

    @SuppressLint("MissingPermission")
    @JavascriptInterface
    fun printEscPosBase64(base64Bytes: String, printerAddress: String?): String {
        val adapter = getBluetoothAdapter()
            ?: return jsonResponse(false, "Bluetooth is not supported on this device.")

        if (!adapter.isEnabled) {
            return jsonResponse(false, "Please enable Bluetooth and pair your 58mm/80mm printer first.")
        }

        if (!hasConnectPermission()) {
            onRequestBluetoothPermission?.invoke()
            return jsonResponse(false, "Bluetooth permission required. Please grant permission and retry.")
        }

        val rawBytes = try {
            Base64.decode(base64Bytes, Base64.DEFAULT)
        } catch (e: IllegalArgumentException) {
            return jsonResponse(false, "Invalid ESC/POS byte payload.")
        }

        val targetDevice: BluetoothDevice? = try {
            val bonded = adapter.bondedDevices ?: emptySet()
            if (!printerAddress.isNullOrBlank()) {
                bonded.firstOrNull { it.address.equals(printerAddress, ignoreCase = true) }
                    ?: adapter.getRemoteDevice(printerAddress)
            } else {
                bonded.firstOrNull()
            }
        } catch (e: Throwable) {
            null
        }

        if (targetDevice == null) {
            return jsonResponse(false, "No paired thermal printer found. Pair your 58mm/80mm printer in Android Settings.")
        }

        var socket: BluetoothSocket? = null
        return try {
            if (ActivityCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED) {
                adapter.cancelDiscovery()
            }
            socket = targetDevice.createRfcommSocketToServiceRecord(SPP_UUID)
            socket.connect()
            socket.outputStream.use { out ->
                out.write(rawBytes)
                out.flush()
            }
            jsonResponse(true, "Printed via Bluetooth ESC/POS (${targetDevice.name ?: targetDevice.address}).")
        } catch (e: IOException) {
            jsonResponse(false, "Failed to connect to printer ${targetDevice.name ?: targetDevice.address}: ${e.localizedMessage}")
        } catch (t: Throwable) {
            jsonResponse(false, "Bluetooth print error: ${t.localizedMessage}")
        } finally {
            try {
                socket?.close()
            } catch (_: IOException) {
            }
        }
    }

    private fun jsonResponse(success: Boolean, message: String): String {
        return JSONObject().apply {
            put("success", success)
            put("message", message)
        }.toString()
    }
}
