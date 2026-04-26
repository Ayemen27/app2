package com.axion.app;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@CapacitorPlugin(name = "AxionFileExport")
public class AxionFileExportPlugin extends Plugin {

    private final ConcurrentHashMap<String, FileOutputStream> activeSessions = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, File> sessionFiles = new ConcurrentHashMap<>();

    @PluginMethod
    public void startWrite(PluginCall call) {
        String fileName = call.getString("fileName");
        if (fileName == null || fileName.isEmpty()) {
            call.reject("fileName is required");
            return;
        }

        String sessionId = UUID.randomUUID().toString();
        try {
            File exportDir = new File(getContext().getCacheDir(), "axion_exports");
            if (!exportDir.exists() && !exportDir.mkdirs()) {
                call.reject("ERR_WRITE_FAILED", "Could not create export directory");
                return;
            }

            File file = new File(exportDir, sessionId + "_" + fileName);
            FileOutputStream fos = new FileOutputStream(file);

            activeSessions.put(sessionId, fos);
            sessionFiles.put(sessionId, file);

            JSObject ret = new JSObject();
            ret.put("sessionId", sessionId);
            call.resolve(ret);
        } catch (IOException e) {
            call.reject("ERR_WRITE_FAILED", e.getMessage());
        }
    }

    @PluginMethod
    public void writeChunk(PluginCall call) {
        String sessionId = call.getString("sessionId");
        String chunk = call.getString("chunk");

        if (sessionId == null || chunk == null) {
            call.reject("sessionId and chunk are required");
            return;
        }

        FileOutputStream fos = activeSessions.get(sessionId);
        if (fos == null) {
            call.reject("ERR_NO_SESSION");
            return;
        }

        try {
            byte[] data = Base64.decode(chunk, Base64.DEFAULT);
            fos.write(data);
            call.resolve();
        } catch (IllegalArgumentException e) {
            call.reject("ERR_DECODE_FAILED", e.getMessage());
        } catch (IOException e) {
            call.reject("ERR_WRITE_FAILED", e.getMessage());
        }
    }

    @PluginMethod
    public void finishAndShare(PluginCall call) {
        String sessionId = call.getString("sessionId");
        String mimeType = call.getString("mimeType");
        String dialogTitle = call.getString("dialogTitle", "Share file");

        if (sessionId == null || mimeType == null) {
            call.reject("sessionId and mimeType are required");
            return;
        }

        File file = finalizeSession(sessionId);
        if (file == null || !file.exists()) {
            call.reject("ERR_NO_FILE");
            return;
        }

        try {
            Context context = getContext();
            Uri contentUri = FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", file);

            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType(mimeType);
            shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            Intent chooser = Intent.createChooser(shareIntent, dialogTitle);
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(chooser);

            sessionFiles.remove(sessionId);

            JSObject ret = new JSObject();
            ret.put("shared", true);
            call.resolve(ret);
        } catch (Exception e) {
            sessionFiles.remove(sessionId);
            file.delete();
            call.reject("ERR_SHARE_FAILED", e.getMessage());
        }
    }

    @Override
    public void load() {
        super.load();
        cleanupOldExports();
    }

    private void cleanupOldExports() {
        try {
            File exportDir = new File(getContext().getCacheDir(), "axion_exports");
            if (!exportDir.exists() || !exportDir.isDirectory()) return;
            long cutoff = System.currentTimeMillis() - (60L * 60L * 1000L);
            File[] files = exportDir.listFiles();
            if (files == null) return;
            for (File f : files) {
                if (f.isFile() && f.lastModified() < cutoff) {
                    f.delete();
                }
            }
        } catch (Exception ignored) {}
    }

    @PluginMethod
    public void finishAndSaveToDownloads(PluginCall call) {
        String sessionId = call.getString("sessionId");
        String mimeType = call.getString("mimeType");

        if (sessionId == null || mimeType == null) {
            call.reject("sessionId and mimeType are required");
            return;
        }

        File file = finalizeSession(sessionId);
        if (file == null || !file.exists()) {
            call.reject("ERR_NO_FILE");
            return;
        }

        try {
            String fileName = file.getName().substring(sessionId.length() + 1);
            ContentResolver resolver = getContext().getContentResolver();
            Uri downloadUri;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues contentValues = new ContentValues();
                contentValues.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
                contentValues.put(MediaStore.Downloads.MIME_TYPE, mimeType);
                contentValues.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                contentValues.put(MediaStore.Downloads.IS_PENDING, 1);

                downloadUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues);
                if (downloadUri == null) {
                    throw new IOException("Failed to create MediaStore entry");
                }

                try (OutputStream os = resolver.openOutputStream(downloadUri);
                     InputStream is = new FileInputStream(file)) {
                    copyStream(is, os);
                }

                contentValues.clear();
                contentValues.put(MediaStore.Downloads.IS_PENDING, 0);
                resolver.update(downloadUri, contentValues, null, null);
            } else {
                File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                File targetFile = new File(downloadsDir, fileName);
                try (OutputStream os = new FileOutputStream(targetFile);
                     InputStream is = new FileInputStream(file)) {
                    copyStream(is, os);
                }
                downloadUri = Uri.fromFile(targetFile);
            }

            JSObject ret = new JSObject();
            ret.put("uri", downloadUri.toString());
            ret.put("relativePath", Environment.DIRECTORY_DOWNLOADS + "/" + fileName);
            call.resolve(ret);
        } catch (IOException e) {
            call.reject("ERR_MEDIASTORE_FAILED", e.getMessage());
        } finally {
            sessionFiles.remove(sessionId);
            file.delete();
        }
    }

    @PluginMethod
    public void finishAndSaveAs(PluginCall call) {
        String sessionId = call.getString("sessionId");
        String mimeType = call.getString("mimeType");

        if (sessionId == null || mimeType == null) {
            call.reject("sessionId and mimeType are required");
            return;
        }

        File file = finalizeSession(sessionId);
        if (file == null || !file.exists()) {
            call.reject("ERR_NO_FILE");
            return;
        }

        String fileName = file.getName().substring(sessionId.length() + 1);

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, fileName);

        saveCall(call);
        startActivityForResult(call, intent, "saveAsCallback");
    }

    @ActivityCallback
    private void saveAsCallback(PluginCall call, ActivityResult result) {
        String sessionId = call.getString("sessionId");
        File file = sessionFiles.get(sessionId);
        
        if (result.getResultCode() == Activity.RESULT_CANCELED) {
            if (file != null) file.delete();
            sessionFiles.remove(sessionId);
            call.reject("ERR_USER_CANCELLED");
            return;
        }

        Intent data = result.getData();
        if (data == null || data.getData() == null) {
            if (file != null) file.delete();
            sessionFiles.remove(sessionId);
            call.reject("ERR_WRITE_FAILED", "No URI returned from picker");
            return;
        }

        Uri targetUri = data.getData();
        try {
            ContentResolver resolver = getContext().getContentResolver();
            try (OutputStream os = resolver.openOutputStream(targetUri);
                 InputStream is = new FileInputStream(file)) {
                copyStream(is, os);
            }

            JSObject ret = new JSObject();
            ret.put("uri", targetUri.toString());
            call.resolve(ret);
        } catch (IOException e) {
            call.reject("ERR_WRITE_FAILED", e.getMessage());
        } finally {
            if (file != null) file.delete();
            sessionFiles.remove(sessionId);
        }
    }

    @PluginMethod
    public void cancelWrite(PluginCall call) {
        String sessionId = call.getString("sessionId");
        if (sessionId == null) {
            call.reject("sessionId is required");
            return;
        }

        finalizeSession(sessionId); // Closes stream
        File file = sessionFiles.remove(sessionId);
        if (file != null && file.exists()) {
            file.delete();
        }
        call.resolve();
    }

    private File finalizeSession(String sessionId) {
        FileOutputStream fos = activeSessions.remove(sessionId);
        if (fos != null) {
            try {
                fos.flush();
                fos.close();
            } catch (IOException ignored) {}
        }
        return sessionFiles.get(sessionId);
    }

    private void copyStream(InputStream is, OutputStream os) throws IOException {
        byte[] buffer = new byte[64 * 1024];
        int bytesRead;
        while ((bytesRead = is.read(buffer)) != -1) {
            os.write(buffer, 0, bytesRead);
        }
        os.flush();
    }
}
