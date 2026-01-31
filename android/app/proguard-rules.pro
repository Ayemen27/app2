# Capacitor Core
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.PluginMethod public <methods>;
}

# Capacitor Plugins
-keep public class * extends com.getcapacitor.Plugin

# SQLCipher (for SQLite Plugin)
-keep,includedescriptorclasses class net.sqlcipher.** { *; }
-keep,includedescriptorclasses interface net.sqlcipher.** { *; }

# Cordova plugins
-keep public class * extends org.apache.cordova.* {
    public <methods>;
    public <fields>;
}

# Keep WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Capacitor bridge classes
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.plugins.** { *; }

# Preserve line number information for debugging
-keepattributes SourceFile,LineNumberTable
