# نظام نقل الأصول بين حسابات Replit

نظام احترافي لنقل الملفات الكبيرة والحساسة المستبعدة من Git بين حسابات Replit المختلفة، عبر سيرفر خارجي.

---

## نظرة عامة

`.gitignore` يستبعد ~520 MB من الملفات المهمة (الأصول، قواعد البيانات المحلية، النسخ الاحتياطية، إلخ). هذا النظام يحلّ المشكلة عبر:

1. **حزمها** في أرشيف مشفّر بإصدار (version)
2. **رفعها** للسيرفر الخارجي عبر SSH
3. **سحبها** في الحساب الجديد بأمر واحد

## المعمارية

```
┌──────────────┐       SSH       ┌──────────────┐       SSH       ┌──────────────┐
│   Replit A   │  ─── push ───►  │  Server      │  ◄── pull ───   │   Replit B   │
│   (المصدر)   │                  │  (التخزين)   │                  │   (الوجهة)   │
└──────────────┘                  └──────────────┘                  └──────────────┘
       │                                  │                                │
       │ pack-and-publish.sh              │                                │ pull-and-restore.sh
       │ ↓                                │                                │ ↓
       │ tar + gpg + scp                  │  ~/replit-assets-versions/     │ scp + gpg + tar
                                          │    ├─ assets-v1.0.0.tar.gz.gpg
                                          │    ├─ assets-v1.0.1.tar.gz.gpg
                                          │    ├─ LATEST.txt
                                          │    └─ manifests/
```

## الاستخدام

### 1) النشر (من الحساب المصدر)

```bash
# نشر تلقائي بإصدار مرتبط بالتاريخ
./scripts/transfer/pack-and-publish.sh

# نشر بإصدار محدد
./scripts/transfer/pack-and-publish.sh v1.2.3

# تجربة دون رفع فعلي
./scripts/transfer/pack-and-publish.sh --dry-run

# بدون تشفير (غير مستحسن)
./scripts/transfer/pack-and-publish.sh --no-encrypt
```

### 2) عرض الإصدارات

```bash
./scripts/transfer/list-versions.sh
```

### 3) الاستعادة (في الحساب الجديد)

```bash
# سحب آخر إصدار
./scripts/transfer/pull-and-restore.sh

# سحب إصدار محدد
./scripts/transfer/pull-and-restore.sh v1.2.3

# بدون تأكيد تفاعلي
./scripts/transfer/pull-and-restore.sh --force

# بدون نسخ احتياطي (أسرع لكن أخطر)
./scripts/transfer/pull-and-restore.sh --no-backup
```

## الملفات المشمولة

| المسار | السبب |
|--------|------|
| `attached_assets/` | المرفقات المستخدمة في الواجهة |
| `backups/` | النسخ الاحتياطية للقاعدة |
| `uploads/` | ملفات المستخدمين المرفوعة |
| `wa-import-data/` | بيانات استيراد واتساب |
| `local.db` | قاعدة بيانات محلية |
| `*.traineddata` | بيانات تدريب OCR (Tesseract) |
| `.env`, `.env.production` | متغيرات البيئة |
| `google-services.json` | إعدادات Firebase |
| `auth_info_baileys/` | جلسة واتساب (قد تنتهي صلاحيتها) |

## الملفات المستثناة دائماً (حماية إضافية)

`.git`, `node_modules`, `.cache`, `.local`, `.config`, `.upm`, `dist`, `www`, `.pythonlibs`

## المتغيرات المطلوبة (Replit Secrets)

| المفتاح | الوصف |
|---------|-------|
| `SSH_HOST` | عنوان السيرفر |
| `SSH_USER` | اسم المستخدم |
| `SSH_PORT` | المنفذ (افتراضي 22) |
| `SSH_PASSWORD` أو `SSHPASS` | كلمة مرور SSH |
| `ENCRYPT_PASSPHRASE` (اختياري) | لتجنب السؤال التفاعلي |
| `KEEP_LAST` (اختياري) | عدد الإصدارات المحفوظة (افتراضي 5) |

## الأمان

- التشفير يستخدم **GPG AES-256** (قوة عسكرية)
- كلمة السر **لا تُحفَظ** في أي ملف — تُطلَب تفاعلياً أو من متغير بيئة
- النسخ الاحتياطي التلقائي يحمي من الاستبدال الخاطئ
- قائمة سوداء صريحة تمنع نقل `.git`, `node_modules`, إلخ

## استرداد الكوارث

إذا فقدت كلمة سر التشفير → الأرشيف المشفّر **غير قابل للاسترجاع**. احتفظ بكلمة السر في مدير كلمات سر آمن.

النسخ الاحتياطية المحلية (`.transfer-backup-*`) تُنشأ تلقائياً عند كل `pull` ولا تُحذف ذاتياً — احذفها يدوياً عند التأكد.
