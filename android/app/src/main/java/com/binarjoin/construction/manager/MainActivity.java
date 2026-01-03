package com.binarjoin.construction.manager;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQUEST_CODE = 123;
    private static final int MANAGE_EXTERNAL_STORAGE_REQUEST_CODE = 124;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        checkAndRequestPermissions();
    }

    private void checkAndRequestPermissions() {
        List<String> permissionsNeeded = new ArrayList<>();

        // 1. Handle MANAGE_EXTERNAL_STORAGE for Android 11+ (API 30+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (!Environment.isExternalStorageManager()) {
                try {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                    intent.addCategory("android.intent.category.DEFAULT");
                    intent.setData(Uri.parse(String.format("package:%s", getApplicationContext().getPackageName())));
                    startActivityForResult(intent, MANAGE_EXTERNAL_STORAGE_REQUEST_CODE);
                } catch (Exception e) {
                    Intent intent = new Intent();
                    intent.setAction(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                    startActivityForResult(intent, MANAGE_EXTERNAL_STORAGE_REQUEST_CODE);
                }
            }
        }

        // 2. Standard permissions request
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                // Android 13+
                addPermission(permissionsNeeded, Manifest.permission.READ_MEDIA_IMAGES);
                addPermission(permissionsNeeded, Manifest.permission.READ_MEDIA_VIDEO);
                addPermission(permissionsNeeded, Manifest.permission.READ_MEDIA_AUDIO);
                addPermission(permissionsNeeded, Manifest.permission.POST_NOTIFICATIONS);
            } else {
                // Android 6.0 - 12
                addPermission(permissionsNeeded, Manifest.permission.READ_EXTERNAL_STORAGE);
                addPermission(permissionsNeeded, Manifest.permission.WRITE_EXTERNAL_STORAGE);
            }

            if (!permissionsNeeded.isEmpty()) {
                ActivityCompat.requestPermissions(this, 
                    permissionsNeeded.toArray(new String[0]), 
                    PERMISSION_REQUEST_CODE);
            }
        }
    }

    private void addPermission(List<String> permissionsList, String permission) {
        if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
            permissionsList.add(permission);
        }
    }
}
