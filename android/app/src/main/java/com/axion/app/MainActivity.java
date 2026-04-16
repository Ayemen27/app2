package com.axion.app;

import android.content.Context;
import android.content.res.Configuration;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowInsetsController;
import com.getcapacitor.BridgeActivity;
import java.util.Locale;

public class MainActivity extends BridgeActivity {

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

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Support edge-to-edge display on Android 15+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.setSystemBarsAppearance(0, WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS);
            }
        }
    }
}
