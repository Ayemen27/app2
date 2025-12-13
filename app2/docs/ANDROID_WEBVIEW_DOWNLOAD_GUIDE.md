# دليل تمكين تنزيل الملفات في Android WebView

## المشكلة
عند عرض الموقع داخل تطبيق Android WebView، لا تعمل عملية تنزيل الملفات (مثل Excel) لأن WebView يحظر تنزيل الملفات عبر data URIs و blob URLs.

## الحل
يجب إضافة JavaScript Bridge في تطبيق الأندرويد ليتمكن الموقع من إرسال الملفات للتطبيق.

---

## الخطوة 1: إنشاء JavaScript Interface في الأندرويد

أضف هذا الكود في Activity الذي يحتوي على WebView:

```java
// WebViewDownloadInterface.java
package com.yourapp.name;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Environment;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.widget.Toast;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

public class WebViewDownloadInterface {
    private Context context;

    public WebViewDownloadInterface(Context context) {
        this.context = context;
    }

    @JavascriptInterface
    public void downloadBase64File(String base64Data, String fileName, String mimeType) {
        try {
            // فك تشفير Base64
            byte[] fileBytes = Base64.decode(base64Data, Base64.DEFAULT);
            
            // حفظ الملف في مجلد التنزيلات
            File downloadsDir = Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_DOWNLOADS
            );
            File file = new File(downloadsDir, fileName);
            
            // كتابة الملف
            FileOutputStream fos = new FileOutputStream(file);
            fos.write(fileBytes);
            fos.close();
            
            // إظهار رسالة نجاح
            Toast.makeText(context, "تم تنزيل: " + fileName, Toast.LENGTH_SHORT).show();
            
            // فتح الملف تلقائياً
            openFile(file, mimeType);
            
        } catch (IOException e) {
            Toast.makeText(context, "فشل التنزيل: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    @JavascriptInterface
    public void downloadFile(String base64Data, String fileName, String mimeType) {
        downloadBase64File(base64Data, fileName, mimeType);
    }

    @JavascriptInterface
    public void shareFile(String base64Data, String fileName, String mimeType) {
        try {
            byte[] fileBytes = Base64.decode(base64Data, Base64.DEFAULT);
            
            // حفظ مؤقت في cache
            File cacheDir = context.getCacheDir();
            File file = new File(cacheDir, fileName);
            FileOutputStream fos = new FileOutputStream(file);
            fos.write(fileBytes);
            fos.close();
            
            // مشاركة الملف
            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType(mimeType);
            Uri fileUri = androidx.core.content.FileProvider.getUriForFile(
                context,
                context.getPackageName() + ".fileprovider",
                file
            );
            shareIntent.putExtra(Intent.EXTRA_STREAM, fileUri);
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            context.startActivity(Intent.createChooser(shareIntent, "مشاركة الملف"));
            
        } catch (IOException e) {
            Toast.makeText(context, "فشل المشاركة: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private void openFile(File file, String mimeType) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            Uri fileUri = androidx.core.content.FileProvider.getUriForFile(
                context,
                context.getPackageName() + ".fileprovider",
                file
            );
            intent.setDataAndType(fileUri, mimeType);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            context.startActivity(intent);
        } catch (Exception e) {
            // تجاهل إذا لم يتم العثور على تطبيق لفتح الملف
        }
    }
}
```

---

## الخطوة 2: ربط الـ Interface بـ WebView

في Activity الخاص بك:

```java
// MainActivity.java
public class MainActivity extends AppCompatActivity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        webView = findViewById(R.id.webview);
        
        // إعدادات WebView
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setAllowFileAccess(true);
        
        // إضافة JavaScript Interface
        webView.addJavascriptInterface(
            new WebViewDownloadInterface(this),
            "Android"  // هذا الاسم مهم - يجب أن يكون "Android"
        );
        
        // تحميل الموقع
        webView.loadUrl("https://your-site-url.com");
    }
}
```

---

## الخطوة 3: إضافة FileProvider (مطلوب لـ Android 7+)

في `AndroidManifest.xml`:

```xml
<manifest ...>
    <!-- أذونات التخزين -->
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    
    <application ...>
        <!-- FileProvider للمشاركة -->
        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>
</manifest>
```

أنشئ ملف `res/xml/file_paths.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<paths>
    <external-path name="downloads" path="Download/" />
    <cache-path name="cache" path="/" />
</paths>
```

---

## الخطوة 4: طلب أذونات التخزين (Android 6+)

```java
// في onCreate أو عند الضغط على زر التنزيل
private void checkStoragePermission() {
    if (ContextCompat.checkSelfPermission(this, 
            Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
        ActivityCompat.requestPermissions(this,
            new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE},
            100);
    }
}
```

---

## كيف يعمل النظام؟

1. عند الضغط على زر "تصدير Excel" في الموقع
2. الموقع يفحص إذا كان `window.Android` موجوداً
3. إذا وجد، يُرسل الملف كـ Base64 إلى `window.Android.downloadBase64File()`
4. تطبيق الأندرويد يستقبل البيانات ويحفظها في مجلد التنزيلات
5. يُظهر رسالة نجاح ويفتح الملف تلقائياً

---

## اختبار التكامل

بعد إضافة الكود، يمكنك اختبار التكامل عبر Console في Chrome DevTools:

```javascript
// التحقق من وجود Android Bridge
console.log('Android Bridge:', typeof window.Android);
console.log('downloadBase64File:', typeof window.Android?.downloadBase64File);
```

---

## ملاحظات مهمة

- اسم الـ Interface يجب أن يكون **"Android"** بالضبط (حساس لحالة الأحرف)
- الموقع يدعم تلقائياً Android Bridge عند توفره
- إذا لم يتوفر Bridge، سيحاول الموقع استخدام Share API
- تأكد من تمكين JavaScript في WebView
