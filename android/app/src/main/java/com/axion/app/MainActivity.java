package com.axion.app;

import android.content.Context;
import android.content.res.Configuration;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowInsetsController;

import com.byteowls.capacitor.filesharer.FileSharerPlugin;
import com.capacitorjs.osinappbrowser.InAppBrowserPlugin;
import com.capacitorjs.plugins.app.AppPlugin;
import com.capacitorjs.plugins.browser.BrowserPlugin;
import com.capacitorjs.plugins.device.DevicePlugin;
import com.capacitorjs.plugins.filesystem.FilesystemPlugin;
import com.capacitorjs.plugins.localnotifications.LocalNotificationsPlugin;
import com.capacitorjs.plugins.network.NetworkPlugin;
import com.capacitorjs.plugins.preferences.PreferencesPlugin;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.capacitorjs.plugins.share.SharePlugin;
import com.capacitorjs.plugins.statusbar.StatusBarPlugin;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.community.database.sqlite.CapacitorSQLitePlugin;

import ee.forgr.biometric.NativeBiometric;

import java.util.Locale;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppPlugin.class);
        registerPlugin(DevicePlugin.class);
        registerPlugin(FilesystemPlugin.class);
        registerPlugin(FileSharerPlugin.class);
        registerPlugin(NativeBiometric.class);
        registerPlugin(PreferencesPlugin.class);
        registerPlugin(NetworkPlugin.class);
        registerPlugin(SharePlugin.class);
        registerPlugin(StatusBarPlugin.class);
        registerPlugin(LocalNotificationsPlugin.class);
        registerPlugin(PushNotificationsPlugin.class);
        registerPlugin(BrowserPlugin.class);
        registerPlugin(InAppBrowserPlugin.class);
        registerPlugin(CapacitorSQLitePlugin.class);
        registerPlugin(ApkUpdaterPlugin.class);
        super.onCreate(savedInstanceState);
        applyEdgeToEdge();
    }

    private void applyEdgeToEdge() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.setSystemBarsAppearance(0, WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS);
            }
        }
    }

    /**
     * Force English (Western) numerals as the WebView default locale.
     * This prevents Arabic-Indic numerals (١٢٣) in JavaScript Intl API
     * when toLocaleString() is called without an explicit locale argument.
     * Arabic text content and RTL layout are unaffected — they are controlled
     * by the HTML/CSS dir="rtl" attribute, not by the Java locale context.
     */
    @Override
    protected void attachBaseContext(Context base) {
        Locale locale = new Locale("en", "US");
        Locale.setDefault(locale);
        Configuration config = new Configuration(base.getResources().getConfiguration());
        config.setLocale(locale);
        Context context = base.createConfigurationContext(config);
        super.attachBaseContext(context);
    }
}
