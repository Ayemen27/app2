package com.axion.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "ApkUpdater")
public class ApkUpdaterPlugin extends Plugin {

    private Thread currentDownloadThread = null;
    private volatile boolean cancelRequested = false;

    @PluginMethod
    public void download(final PluginCall call) {
        final String url = call.getString("url");
        final String fileName = call.getString("fileName", "AXION_update.apk");
        if (url == null || url.isEmpty()) {
            call.reject("URL مطلوب");
            return;
        }

        cancelRequested = false;
        call.setKeepAlive(true);

        currentDownloadThread = new Thread(new Runnable() {
            @Override
            public void run() {
                HttpURLConnection conn = null;
                InputStream input = null;
                OutputStream output = null;
                File outFile = null;
                try {
                    File dir = new File(getContext().getExternalCacheDir(), "updates");
                    if (!dir.exists()) dir.mkdirs();
                    outFile = new File(dir, fileName);
                    if (outFile.exists()) outFile.delete();

                    URL u = new URL(url);
                    conn = (HttpURLConnection) u.openConnection();
                    conn.setConnectTimeout(20000);
                    conn.setReadTimeout(60000);
                    conn.setRequestMethod("GET");
                    conn.connect();

                    int code = conn.getResponseCode();
                    if (code < 200 || code >= 300) {
                        call.reject("HTTP " + code);
                        return;
                    }

                    long total = conn.getContentLengthLong();
                    input = conn.getInputStream();
                    output = new FileOutputStream(outFile);

                    byte[] buf = new byte[64 * 1024];
                    long downloaded = 0;
                    int read;
                    long lastEmit = System.currentTimeMillis();

                    while ((read = input.read(buf)) != -1) {
                        if (cancelRequested) {
                            try { output.close(); } catch (Exception ignored) {}
                            try { outFile.delete(); } catch (Exception ignored) {}
                            JSObject ev = new JSObject();
                            ev.put("cancelled", true);
                            notifyListeners("downloadCancelled", ev);
                            call.reject("تم الإلغاء");
                            return;
                        }
                        output.write(buf, 0, read);
                        downloaded += read;

                        long now = System.currentTimeMillis();
                        if (now - lastEmit >= 200 || downloaded == total) {
                            lastEmit = now;
                            JSObject prog = new JSObject();
                            prog.put("downloaded", downloaded);
                            prog.put("total", total);
                            prog.put("percent", total > 0 ? (downloaded * 100.0 / total) : 0);
                            notifyListeners("downloadProgress", prog);
                        }
                    }

                    output.flush();
                    output.close();
                    output = null;

                    JSObject result = new JSObject();
                    result.put("path", outFile.getAbsolutePath());
                    result.put("size", outFile.length());
                    notifyListeners("downloadComplete", result);
                    call.resolve(result);
                } catch (Exception ex) {
                    if (outFile != null) try { outFile.delete(); } catch (Exception ignored) {}
                    JSObject err = new JSObject();
                    err.put("error", ex.getMessage() != null ? ex.getMessage() : ex.toString());
                    notifyListeners("downloadError", err);
                    call.reject(ex.getMessage() != null ? ex.getMessage() : "فشل التحميل");
                } finally {
                    try { if (input != null) input.close(); } catch (Exception ignored) {}
                    try { if (output != null) output.close(); } catch (Exception ignored) {}
                    try { if (conn != null) conn.disconnect(); } catch (Exception ignored) {}
                    currentDownloadThread = null;
                }
            }
        });
        currentDownloadThread.start();
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        cancelRequested = true;
        call.resolve();
    }

    @PluginMethod
    public void install(PluginCall call) {
        String path = call.getString("path");
        if (path == null || path.isEmpty()) {
            call.reject("path مطلوب");
            return;
        }
        File apk = new File(path);
        if (!apk.exists()) {
            call.reject("ملف APK غير موجود: " + path);
            return;
        }

        try {
            Uri apkUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                apk
            );

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!getContext().getPackageManager().canRequestPackageInstalls()) {
                    Intent settings = new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                    settings.setData(Uri.parse("package:" + getContext().getPackageName()));
                    settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(settings);
                    JSObject result = new JSObject();
                    result.put("requiresPermission", true);
                    call.resolve(result);
                    return;
                }
            }

            getContext().startActivity(intent);
            JSObject result = new JSObject();
            result.put("started", true);
            call.resolve(result);
        } catch (Exception ex) {
            call.reject("فشل فتح المثبّت: " + (ex.getMessage() != null ? ex.getMessage() : ex.toString()));
        }
    }
}
