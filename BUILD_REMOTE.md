# 🚀 بناء التطبيق على السيرفر الخارجي

دليل شامل للاتصال بسيرفر خارجي وبناء التطبيق هناك عبر SSH.

---

## 📋 المتطلبات

### على جهاز Replit
- ✅ `ssh` و `scp` (مثبتان بالفعل)
- ✅ `sshpass` (اختياري - لكلمة المرور)
- ✅ git

### على السيرفر الخارجي
- ✅ Node.js 18+
- ✅ npm 9+
- ✅ SSH Server مثبت

---

## 🔐 إضافة بيانات الاتصال إلى Secrets

اذهب إلى **Replit Secrets** وأضف:

```env
SSH_USER=your_username         # اسم المستخدم
SSH_HOST=your.server.com       # عنوان السيرفر
SSH_PORT=22                    # منفذ SSH
SSH_PASSWORD=your_password     # كلمة المرور (للطريقة الأولى)
SSH_PUBLIC_KEY=your_key        # محتوى المفتاح العام (للطريقة الثانية)
```

---

## 🛠️ الخيار 1: باستخدام كلمة المرور (أسهل)

### المتطلبات الإضافية
```bash
# تثبيت sshpass
sudo apt-get install sshpass
```

### التشغيل
```bash
./build-remote.sh
```

### المميزات
- ✅ بسيط وسريع
- ✅ لا يحتاج إلى إعداد مفاتيح
- ❌ أقل أماناً من SSH Key

---

## 🔑 الخيار 2: باستخدام SSH Key (أكثر أماناً)

### المتطلبات
- ✅ SSH Key موجود في Secrets
- ✅ لا تحتاج sshpass

### التشغيل
```bash
./build-remote-key.sh
```

### المميزات
- ✅ أكثر أماناً
- ✅ لا يحتاج إلى كلمة مرور في الأوامر
- ✅ قياسي في الشركات

---

## 📊 كيفية السكريبت

### الخطوات:

```
1. قراءة بيانات الاتصال من Environment Variables ✓
   ├── SSH_USER
   ├── SSH_HOST
   ├── SSH_PORT
   └── SSH_PASSWORD أو SSH_PUBLIC_KEY

2. الاتصال بالسيرفر وإنشاء مجلد مؤقت ✓

3. نقل ملفات المشروع (بدون node_modules) ✓

4. تثبيت المتطلبات على السيرفر ✓

5. بناء التطبيق ✓
   ├── npm run build:client (Vite)
   └── npm run build:server (esbuild)

6. تحميل المخرجات إلى dist/ ✓

7. تنظيف المجلد المؤقت على السيرفر ✓
```

---

## 📁 الملفات المستخدمة

| الملف | الحجم (بدون node_modules) |
|------|--------------------------|
| `package.json` | ~2 KB |
| `client/src/` | ~500 KB |
| `server/` | ~200 KB |
| `shared/` | ~50 KB |
| **المجموع** | ~750 KB |

---

## ⏱️ الوقت المتوقع

| الخطوة | الوقت |
|-------|-------|
| الاتصال | ~2 ثانية |
| نقل الملفات | ~5-10 ثواني |
| تثبيت npm | ~30-60 ثانية |
| البناء | ~30-90 ثانية |
| التحميل | ~5-10 ثواني |
| **المجموع** | **~2-3 دقائق** |

---

## 🔍 استكشاف الأخطاء

### ❌ "Permission denied (publickey,password)"

**السبب**: بيانات الاتصال غير صحيحة  
**الحل**:
```bash
# تحقق من البيانات
echo $SSH_USER
echo $SSH_HOST
echo $SSH_PORT

# اختبر الاتصال يدوياً
ssh -p $SSH_PORT $SSH_USER@$SSH_HOST "echo 'OK'"
```

### ❌ "command not found: sshpass"

**السبب**: sshpass غير مثبت  
**الحل**:
```bash
# استخدم السكريبت الثاني (SSH Key)
./build-remote-key.sh
```

### ❌ "Connection timeout"

**السبب**: السيرفر غير متاح  
**الحل**:
```bash
# تحقق من الاتصال
ping $SSH_HOST
# أو
telnet $SSH_HOST $SSH_PORT
```

### ❌ "npm: command not found"

**السبب**: Node.js غير مثبت على السيرفر  
**الحل**:
```bash
# على السيرفر
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## 💡 نصائح

### 1️⃣ تسريع البناء
```bash
# أضف هذا قبل التشغيل
export NODE_OPTIONS="--max-old-space-size=4096"
```

### 2️⃣ حفظ المخرجات
```bash
# احفظ السجل
./build-remote-key.sh 2>&1 | tee build-$(date +%Y%m%d_%H%M%S).log
```

### 3️⃣ بناء متزامن
```bash
# شغّل عدة عمليات بناء
./build-remote-key.sh &
./build-remote-key.sh &
wait
```

---

## 🔒 الأمان

### ✅ أفضل الممارسات

1. **استخدم SSH Key بدل الكلمة المرور**
   ```bash
   # ولا تضع الكلمة المرور في الملفات
   ```

2. **استخدم مفتاح قراءة فقط عند الحاجة**

3. **قم بتنظيف الملفات المؤقتة**
   - السكريبت يفعل ذلك تلقائياً

4. **لا تترك SSH مفتوحاً**
   - الاتصال يُغلق تلقائياً

---

## 📈 المثال الكامل

```bash
# 1. إضافة البيانات إلى Secrets
# (عبر Replit UI)

# 2. جعل السكريبت قابل للتنفيذ
chmod +x build-remote-key.sh

# 3. تشغيل البناء
./build-remote-key.sh

# 4. النتيجة
# ✅ تم تحميل الملفات إلى dist/
# ✅ يمكنك الآن نشرها
```

---

## 🎯 الخطوة التالية

```bash
# بعد اكتمال البناء
ls -la dist/

# للنشر على Replit
npm run dev

# أو للنشر على خادم الويب
rsync -av dist/ user@webserver:/var/www/html/
```

---

**آخر تحديث**: 24 ديسمبر 2025
