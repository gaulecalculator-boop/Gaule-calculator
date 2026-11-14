/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GAULE CALCULATOR — Native Android APK & Web/PWA Compatibility Bridge
 * Handles WhatsApp/tel/external intents, MediaStore file downloads (PDF/CSV/JSON/PNG),
 * native Android PrintManager printing, and Bluetooth ESC/POS thermal printing.
 */

export interface PairedBluetoothPrinter {
  name: string;
  address: string;
  bonded?: boolean;
}

interface NativeAndroidAppBridge {
  openExternalUrl?: (url: string) => boolean | void;
  saveFileBase64?: (base64Data: string, filename: string, mimeType: string) => boolean | void;
  printHtml?: (html: string, jobName: string) => void;
  getAppVersion?: () => string;
  requestPlayIntegrityToken?: (nonce: string) => void;
}

interface NativeBluetoothPrinterBridge {
  isSupported?: () => boolean;
  getPairedPrintersJson?: () => string;
  printEscPosBase64?: (base64Bytes: string, printerAddress?: string) => string;
}

declare global {
  interface Window {
    AndroidApp?: NativeAndroidAppBridge;
    AndroidThermalPrinter?: NativeBluetoothPrinterBridge;
    __ghauleHandleBackPress?: () => boolean;
  }
}

export function isAndroidNativeApp(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.AndroidApp || (window as any).AndroidAuth || window.AndroidThermalPrinter)
  );
}

/**
 * Opens external URLs (WhatsApp wa.me, tel:, mailto:, https:) safely in both
 * Android WebView APK (via Intent.ACTION_VIEW) and standard Web/PWA browsers.
 */
export function openExternalUrl(url: string): boolean {
  if (typeof window === 'undefined' || !url) return false;

  try {
    if (window.AndroidApp?.openExternalUrl) {
      window.AndroidApp.openExternalUrl(url);
      return true;
    }
  } catch (err) {
    console.warn('[AndroidBridge] openExternalUrl native fallback triggered:', err);
  }

  try {
    if (/^(tel:|mailto:|whatsapp:|sms:)/i.test(url)) {
      const a = document.createElement('a');
      a.href = url;
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    }

    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (opened) return true;

    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch (err) {
    console.warn('[AndroidBridge] Browser external URL error:', err);
    return false;
  }
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  return uint8ToBase64(new Uint8Array(buf));
}

function triggerBrowserBlobDownload(blob: Blob, filename: string): void {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}

/**
 * Downloads a Blob (PDF, CSV, JSON, PNG, etc.) cleanly on both Android WebView APK
 * (via Base64 -> Android MediaStore Downloads) and standard browsers.
 */
export async function downloadBlobFile(
  blob: Blob,
  filename: string,
  mimeType = blob.type || 'application/octet-stream'
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  if (window.AndroidApp?.saveFileBase64) {
    try {
      const b64 = await blobToBase64(blob);
      window.AndroidApp.saveFileBase64(b64, filename, mimeType);
      return true;
    } catch (err) {
      console.warn('[AndroidBridge] Native blob save failed, falling back to browser download:', err);
    }
  }

  triggerBrowserBlobDownload(blob, filename);
  return true;
}

export async function downloadTextFile(
  content: string,
  filename: string,
  mimeType = 'text/plain;charset=utf-8'
): Promise<boolean> {
  const blob = new Blob([content], { type: mimeType });
  return downloadBlobFile(blob, filename, mimeType);
}

export function downloadDataUrlFile(dataUrl: string, filename: string): boolean {
  if (typeof window === 'undefined') return false;

  if (window.AndroidApp?.saveFileBase64 && dataUrl.startsWith('data:')) {
    try {
      const commaIdx = dataUrl.indexOf(',');
      const meta = dataUrl.slice(5, commaIdx);
      const mimeType = meta.split(';')[0] || 'application/octet-stream';
      const base64Data = dataUrl.slice(commaIdx + 1);
      window.AndroidApp.saveFileBase64(base64Data, filename, mimeType);
      return true;
    } catch (err) {
      console.warn('[AndroidBridge] Native dataUrl save failed:', err);
    }
  }

  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return true;
}

/**
 * Saves a jsPDF document cleanly across Android APK WebView and Web browsers.
 */
export function saveJsPdfDocument(
  doc: { output: (type: 'arraybuffer') => ArrayBuffer; save: (name: string) => void },
  filename: string
): void {
  if (typeof window === 'undefined') {
    doc.save(filename);
    return;
  }

  if (window.AndroidApp?.saveFileBase64) {
    try {
      const buf = doc.output('arraybuffer');
      const b64 = uint8ToBase64(new Uint8Array(buf));
      window.AndroidApp.saveFileBase64(b64, filename, 'application/pdf');
      return;
    } catch (err) {
      console.warn('[AndroidBridge] Native PDF save failed, using doc.save:', err);
    }
  }

  doc.save(filename);
}

/**
 * Prints arbitrary HTML via Android PrintManager (when in APK) or a hidden iframe (when in Browser).
 */
export function printHtmlDocument(html: string, jobTitle = 'Gaule Calculator Receipt'): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  if (window.AndroidApp?.printHtml) {
    try {
      window.AndroidApp.printHtml(html, jobTitle);
      return;
    } catch (err) {
      console.warn('[AndroidBridge] Native printHtml error, using browser iframe print:', err);
    }
  }

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1500);
  };

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      if (typeof window.print === 'function') window.print();
    } finally {
      cleanup();
    }
  };

  iframe.srcdoc = html;
}

/**
 * Prints the current page/modal cleanly on Android APK (wrapping current document styles)
 * or via window.print() in standard browsers.
 */
export function printCurrentView(jobTitle = 'Gaule Calculator Document'): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  if (window.AndroidApp?.printHtml) {
    try {
      const html = `<!DOCTYPE html><html>${document.head.outerHTML}<body>${document.body.innerHTML}</body></html>`;
      window.AndroidApp.printHtml(html, jobTitle);
      return;
    } catch (err) {
      console.warn('[AndroidBridge] printCurrentView native fallback:', err);
    }
  }

  if (typeof window.print === 'function') {
    window.print();
  }
}

// ---------------------------------------------------------------------------
// Bluetooth ESC/POS Thermal Printer Bridge (58mm & 80mm)
// ---------------------------------------------------------------------------

export function isBluetoothEscPosAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.AndroidThermalPrinter?.printEscPosBase64)
  );
}

export function getPairedBluetoothPrinters(): PairedBluetoothPrinter[] {
  if (typeof window === 'undefined' || !window.AndroidThermalPrinter?.getPairedPrintersJson) {
    return [];
  }
  try {
    const raw = window.AndroidThermalPrinter.getPairedPrintersJson();
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[AndroidBridge] Failed to read paired Bluetooth printers:', err);
    return [];
  }
}

export function sendEscPosToBluetoothPrinter(
  bytes: Uint8Array,
  printerAddress?: string
): { success: boolean; message: string } {
  if (typeof window === 'undefined' || !window.AndroidThermalPrinter?.printEscPosBase64) {
    return {
      success: false,
      message: 'Bluetooth ESC/POS hardware bridge is only available inside the Android APK.',
    };
  }

  try {
    const base64 = uint8ToBase64(bytes);
    const rawResp = window.AndroidThermalPrinter.printEscPosBase64(base64, printerAddress || '');
    const parsed = JSON.parse(rawResp || '{}');
    return {
      success: Boolean(parsed.success),
      message: parsed.message || (parsed.success ? 'Printed via Bluetooth ESC/POS!' : 'Print failed'),
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Bluetooth thermal print error',
    };
  }
}
