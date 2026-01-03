package com.binarjoin.construction.manager;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQUEST_CODE = 123;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        checkAndRequestPermissions();
    }

    private void checkAndRequestPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            List<String> permissionsNeeded = new ArrayList<>();

            // Internet is usually normal permission, but included for completeness
            addPermission(permissionsNeeded, Manifest.permission.INTERNET);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                // Android 13+ (API 33+)
                addPermission(permissionsNeeded, Manifest.permission.READ_MEDIA_IMAGES);
                addPermission(permissionsNeeded, Manifest.permission.READ_MEDIA_VIDEO);
                addPermission(permissionsNeeded, Manifest.permission.READ_MEDIA_AUDIO);
                addPermission(permissionsNeeded, Manifest.permission.POST_NOTIFICATIONS);
            } else {
                // Android 6.0 to 12 (API 23 to 32)
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
