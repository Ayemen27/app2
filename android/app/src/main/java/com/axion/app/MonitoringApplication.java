package com.axion.app;

import androidx.multidex.MultiDexApplication;
// import io.sentry.android.core.SentryAndroid;

public class MonitoringApplication extends MultiDexApplication {
    @Override
    public void onCreate() {
        super.onCreate();
        /*
        SentryAndroid.init(this, options -> {
            options.setDsn("https://examplePublicKey@o0.ingest.sentry.io/0");
            options.setTracesSampleRate(1.0);
            options.setDebug(false);
        });
        */
    }
}
