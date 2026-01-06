# Capacitor
-keep class com.getcapacitor.** { *; }
-keepclassmembers class * {
    @com.getcapacitor.annotation.CapacitorPlugin <methods>;
    @com.getcapacitor.PluginMethod public <methods>;
}

# WebView
-keepclassmembers class * extends android.webkit.WebView {
   public *;
}

# JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep native methods
-keepclassmembers class * {
    native <methods>;
}
