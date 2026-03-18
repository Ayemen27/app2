# تقرير فحص السيرفر الخارجي
### التاريخ: 2026-03-18
### السيرفر: 93.127.142.144 (mr-199)
### الاتصال: SSH (sshpass) — administrator@93.127.142.144:22

---

## ملخص تنفيذي

| البند | الحالة |
|-------|--------|
| الاتصال SSH | ✅ ناجح |
| النظام | Ubuntu 24.04 — Kernel 6.8.0-101 |
| Uptime | 10 أيام، 20 ساعة |
| التطبيق (construction-app) | ⚠️ يعمل لكن غير مستقر (63 restart) |
| PostgreSQL | ✅ يعمل (v16.13) |
| Nginx | ✅ يعمل (12 موقع) |
| المساحة | 🔴 حرجة (95% ممتلئ — 3.5GB فقط متبقي) |
| الذاكرة | 🔴 حرجة (Swap 90% ممتلئ) |
| n8n | ❌ يعيد التشغيل باستمرار (crash loop) |
| Ollama (AI) | ✅ يعمل (llama3.2 + qwen2.5) |

---

## 1. مواصفات السيرفر

| المواصفة | القيمة |
|---------|--------|
| النظام | Ubuntu 24.04 LTS (x86_64) |
| المعالج | Intel Broadwell — 2 cores |
| الذاكرة | 3.8 GB RAM |
| التخزين | 63 GB (57 GB مُستخدمة) |
| Swap | 2.0 GB (1.8 GB مُستخدمة — 90%!) |
| Kernel | 6.8.0-101-generic |
| Uptime | 10 أيام 20 ساعة |
| Load Average | 1.12, 0.99, 0.58 |

---

## 2. الخدمات الشغالة

| الخدمة | الحالة | التفاصيل |
|--------|--------|----------|
| PostgreSQL 16 | ✅ Active | المنفذ 5432 (مفتوح للجميع) |
| Nginx 1.24 | ✅ Active | 12 موقع مُفعّل |
| PM2 | ✅ Active | يدير construction-app (cluster mode × 2) |
| Docker | ✅ Active | يدير tolgee + n8n |
| SSH | ✅ Active | المنفذ 22 |
| Fail2Ban | ✅ Active | حماية SSH |
| Cron | ✅ Active | لا يوجد cron jobs مُعرّفة |
| Ollama | ✅ Active | المنفذ 11434 (localhost فقط) |
| Warp (Cloudflare) | ✅ Active | VPN/DNS |

---

## 3. التطبيق (construction-app)

| البند | القيمة |
|-------|--------|
| الحالة | ✅ online |
| الإصدار | 1.0.29 |
| المسار | `/home/administrator/app2/dist/index.js` |
| Node.js | v22.22.1 |
| الوضع | cluster_mode (2 instances) |
| عدد مرات إعادة التشغيل | ⚠️ **63 restart** |
| استهلاك الذاكرة | ~340 MB × 2 = ~680 MB |
| المنفذ | 6000 |
| الدومين | app2.binarjoinanelytic.info (HTTPS) |

### أخطاء التطبيق (من logs):
```
⚠️ [BackupService] فشل DDL لعدة جداول: "fk.columns.map is not a function"
```
هذا خطأ في BackupService يتكرر لـ 13+ جدول. السبب: مشكلة في استخراج schema بأسلوب Drizzle. لا يؤثر على عمل التطبيق الأساسي لكنه يملأ ملفات الـ logs.

---

## 4. المنافذ المفتوحة

| المنفذ | الخدمة | مُتاح من |
|--------|--------|---------|
| 22 | SSH | الكل |
| 80 | Nginx (HTTP) | الكل |
| 443 | Nginx (HTTPS) | الكل |
| 3306 | MySQL | الكل ⚠️ |
| 5432 | PostgreSQL | الكل ⚠️ |
| 6000 | construction-app (PM2) | الكل |
| 8085 | Tolgee (Docker) | الكل |
| 11434 | Ollama | localhost فقط ✅ |
| 27017 | MongoDB | localhost فقط ✅ |
| 33060 | MySQL X Protocol | localhost فقط ✅ |

### ⚠️ تحذير أمني:
- **PostgreSQL (5432)** و **MySQL (3306)** مفتوحان للعالم. يُفضّل تقييدهم بـ `pg_hba.conf` و `bind-address`.

---

## 5. المواقع المُستضافة (Nginx)

| الموقع | الوظيفة |
|--------|---------|
| `app2.binarjoinanelytic.info` | التطبيق الرئيسي (proxy → port 6000) |
| `binarjoinanelytic.info` | الموقع الرئيسي |
| `binarjoinanalyticnl.nl` | موقع هولندي |
| `bolt.binarjoinanelytic.info` | Bolt (متوقف) |
| `n8n.binarjoinanelytic.info` | n8n (معطل حالياً) |
| `tolgee.binarjoinanelytic.info` | Tolgee (ترجمة) |
| `ai` / `ai-v1` / `ai-v2` / `ai-v3` | خدمات AI |
| `k2panel.conf` | لوحة تحكم |
| `app2-plus` | نسخة إضافية |

### شهادات SSL (Let's Encrypt):
✅ 11 شهادة مُثبّتة لجميع الدومينات.

---

## 6. Docker Containers

| الحاوية | الحالة | ملاحظة |
|---------|--------|--------|
| tolgee | ⚠️ Up 6 days (unhealthy) | يعمل لكن health check فاشل |
| n8n-app | ❌ Restarting (crash loop) | خطأ صلاحيات: `EACCES: permission denied, open '/home/node/.n8n/config'` |

### حل مشكلة n8n:
```bash
docker exec -u root n8n-app chown -R node:node /home/node/.n8n
docker restart n8n-app
```

---

## 7. 🔴 مشاكل حرجة

### A. المساحة شبه ممتلئة (95%)

| المجلد | الحجم |
|--------|-------|
| `/var/log` | **3.7 GB** |
| `/home/administrator/app2/node_modules` | 1.9 GB |
| `/home/administrator/Bot.v4/` | 1.5 GB |
| `/home/administrator/app2-Plus/` | 1.1 GB |
| `/home/administrator/bolt/` | 703 MB |
| `/home/administrator/construction-app/` | 649 MB |
| `/home/administrator/app2/logs` | 63 MB |

**المُتبقي: 3.5 GB فقط!**

**توصيات فورية:**
```bash
# 1. تنظيف logs النظام
sudo journalctl --vacuum-size=200M

# 2. حذف مشاريع متوقفة
rm -rf /home/administrator/bolt/          # 703MB (متوقف)
rm -rf /home/administrator/construction-app/  # 649MB (نسخة قديمة؟)

# 3. تنظيف Docker
docker system prune -a --volumes

# 4. تنظيف node_modules cache
npm cache clean --force
```

### B. Swap مُستنفذ (90%)

```
RAM:  3.8 GB total — 1.9 GB used — 2.0 GB available
Swap: 2.0 GB total — 1.8 GB used — 225 MB free
```

**أكبر مستهلكي الذاكرة:**

| العملية | الذاكرة |
|---------|---------|
| construction-app (instance 1) | 340 MB |
| construction-app (instance 2) | 340 MB |
| Warp (Cloudflare VPN) | 339 MB |
| Tolgee (Java) | 191 MB |
| Fail2Ban | 43 MB |
| Docker daemon | 43 MB |

**المجموع: ~1.3 GB من 3.8 GB** — لكن Swap 90% يعني أن هناك عمليات أخرى تُضغط للـ disk.

**توصية:** إيقاف Warp (339MB) إذا غير ضروري، أو رفع RAM إلى 8GB.

### C. التطبيق يُعيد التشغيل (63 مرة)

التطبيق أُعيد تشغيله 63 مرة. السبب المُرجّح:
- ضغط الذاكرة (Swap thrashing)
- BackupService errors تتراكم
- OOM killer عند امتلاء الذاكرة

---

## 8. Ollama (AI المحلي)

| النموذج | الحجم | النوع |
|---------|-------|-------|
| llama3.2:latest | 2.0 GB | 3.2B params (Q4_K_M) |
| qwen2.5:latest | 4.7 GB | 7.6B params (Q4_K_M) |

✅ يعمل على المنفذ 11434 (localhost فقط).

---

## 9. ملخص التوصيات (حسب الأولوية)

| # | الأولوية | المشكلة | الحل |
|---|---------|---------|------|
| 1 | 🔴 عاجل | المساحة 95% | تنظيف `/var/log` (3.7GB) + حذف مشاريع متوقفة |
| 2 | 🔴 عاجل | Swap 90% | إيقاف Warp أو رفع RAM |
| 3 | 🔴 عاجل | 63 restart | معالجة خطأ BackupService + مراقبة OOM |
| 4 | 🟡 مهم | n8n crash loop | إصلاح صلاحيات Docker volume |
| 5 | 🟡 مهم | PostgreSQL مفتوح | تقييد الوصول بـ `pg_hba.conf` |
| 6 | 🟡 مهم | MySQL مفتوح | تقييد `bind-address` |
| 7 | 🟢 تحسين | Tolgee unhealthy | فحص health check |
| 8 | 🟢 تحسين | لا يوجد cron backups | إعداد نسخ احتياطي تلقائي |
