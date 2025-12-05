# خطة الجودة والاختبار - تطبيق إدارة مشاريع البناء

## 1. استراتيجية الاختبار

### 1.1 هرم الاختبار
```
                    ┌─────────────┐
                    │   E2E       │  10%
                    │  الشامل    │
                ┌───┴─────────────┴───┐
                │   Integration       │  30%
                │   التكامل          │
            ┌───┴─────────────────────┴───┐
            │       Unit Testing          │  60%
            │       الوحدات               │
            └─────────────────────────────┘
```

---

## 2. معايير القبول (Acceptance Criteria)

### 2.1 الأداء
| المعيار | الهدف | الحد الأقصى | طريقة القياس |
|---------|-------|-------------|--------------|
| زمن تحميل التطبيق | < 2s | 3s | First Contentful Paint |
| زمن تحميل الشاشة | < 500ms | 800ms | Screen render time |
| زمن المزامنة (100 سجل) | < 1s | 2s | API response + DB write |
| زمن المزامنة (500 سجل) | < 3s | 5s | API response + DB write |
| استهلاك الذاكرة (الخمول) | < 80MB | 150MB | Android Profiler |
| استهلاك الذاكرة (النشط) | < 150MB | 250MB | Android Profiler |
| استهلاك البطارية/ساعة | < 2% | 3% | Battery Historian |

### 2.2 الموثوقية
| المعيار | الهدف | الحد الأقصى |
|---------|-------|-------------|
| معدل الأعطال (Crash Rate) | < 0.5% | 1% |
| نجاح المزامنة (أول محاولة) | > 95% | 90% |
| نجاح المزامنة (3 محاولات) | > 99.5% | 99% |
| استرداد البيانات بعد إعادة التشغيل | 100% | 100% |
| عدم فقدان بيانات Offline | 100% | 100% |

### 2.3 الوظائف
| المعيار | الهدف |
|---------|-------|
| العمل كامل Offline | 100% CRUD |
| حل التضارب التلقائي | 100% للبيانات العادية |
| إشعار المستخدم بالتضارب المالي | 100% |
| دعم RTL | 100% الشاشات |
| إمكانية الوصول (Accessibility) | WCAG AA |

---

## 3. أنواع الاختبارات

### 3.1 اختبارات الوحدات (Unit Tests)
```typescript
// مثال: اختبار ConflictResolver
describe('ConflictResolver', () => {
  describe('lastWriteWins', () => {
    it('should prefer local when local.updatedAt > remote.updatedAt', () => {
      const local = { id: '1', name: 'Local', updatedAt: 1000 };
      const remote = { id: '1', name: 'Remote', updatedAt: 500 };
      
      const result = resolver.lastWriteWins(local, remote);
      
      expect(result.winner).toBe('local');
      expect(result.data.name).toBe('Local');
    });
    
    it('should prefer remote when remote.updatedAt > local.updatedAt', () => {
      const local = { id: '1', name: 'Local', updatedAt: 500 };
      const remote = { id: '1', name: 'Remote', updatedAt: 1000 };
      
      const result = resolver.lastWriteWins(local, remote);
      
      expect(result.winner).toBe('remote');
      expect(result.data.name).toBe('Remote');
    });
  });
  
  describe('mergeAttendance', () => {
    it('should sum workDays and paidAmount for same date', () => {
      const local = { workerId: 'w1', date: '2025-12-05', workDays: 1, paidAmount: 500 };
      const remote = { workerId: 'w1', date: '2025-12-05', workDays: 0.5, paidAmount: 250 };
      
      const result = resolver.mergeAttendance(local, remote);
      
      expect(result.data.workDays).toBe(1.5);
      expect(result.data.paidAmount).toBe(750);
    });
  });
});
```

### 3.2 اختبارات التكامل (Integration Tests)
```typescript
// مثال: اختبار SyncEngine
describe('SyncEngine Integration', () => {
  let db: RxDatabase;
  let syncEngine: SyncEngine;
  let mockServer: MockServer;
  
  beforeEach(async () => {
    db = await createTestDatabase();
    mockServer = new MockServer();
    syncEngine = new SyncEngine(db, mockServer.url);
  });
  
  it('should push local changes to server', async () => {
    // إضافة سجل محلي
    await db.workers.insert({
      id: 'w1',
      name: 'أحمد',
      syncStatus: 'pending'
    });
    
    // تنفيذ المزامنة
    const result = await syncEngine.startSync();
    
    // التحقق
    expect(result.pushed).toBe(1);
    expect(mockServer.receivedChanges).toHaveLength(1);
    
    const worker = await db.workers.findOne('w1').exec();
    expect(worker.syncStatus).toBe('synced');
  });
  
  it('should pull remote changes', async () => {
    // إعداد السيرفر
    mockServer.addChange({
      table: 'projects',
      operation: 'create',
      data: { id: 'p1', name: 'مشروع جديد' }
    });
    
    // تنفيذ المزامنة
    const result = await syncEngine.startSync();
    
    // التحقق
    expect(result.pulled).toBe(1);
    const project = await db.projects.findOne('p1').exec();
    expect(project.name).toBe('مشروع جديد');
  });
  
  it('should handle offline gracefully', async () => {
    mockServer.goOffline();
    
    const result = await syncEngine.startSync();
    
    expect(result.status).toBe('offline');
  });
});
```

### 3.3 اختبارات E2E (End-to-End)
```typescript
// مثال: سيناريو حضور عامل Offline
describe('Worker Attendance E2E', () => {
  it('should record attendance offline and sync when online', async () => {
    // 1. قطع الاتصال
    await device.setNetworkConditions({ offline: true });
    
    // 2. فتح التطبيق
    await app.launch();
    await loginScreen.login('test@example.com', 'password');
    
    // 3. تسجيل حضور
    await dashboard.navigateTo('attendance');
    await attendanceScreen.selectProject('مشروع البناء');
    await attendanceScreen.selectWorker('أحمد محمد');
    await attendanceScreen.setWorkDays(1);
    await attendanceScreen.setPaidAmount(500);
    await attendanceScreen.save();
    
    // 4. التحقق من الحفظ المحلي
    expect(await attendanceScreen.getSyncStatus()).toBe('pending');
    
    // 5. استعادة الاتصال
    await device.setNetworkConditions({ offline: false });
    
    // 6. انتظار المزامنة
    await waitFor(async () => {
      return (await attendanceScreen.getSyncStatus()) === 'synced';
    }, { timeout: 10000 });
    
    // 7. التحقق من السيرفر
    const serverData = await api.getAttendance('worker-id', '2025-12-05');
    expect(serverData.workDays).toBe(1);
    expect(serverData.paidAmount).toBe(500);
  });
});
```

---

## 4. اختبارات خاصة

### 4.1 اختبار الاتصال الضعيف
```typescript
describe('Poor Network Conditions', () => {
  const networkProfiles = [
    { name: '2G', download: 250, upload: 50, latency: 300 },
    { name: '3G Slow', download: 750, upload: 250, latency: 100 },
    { name: 'Spotty', packetLoss: 30, latency: 500 }
  ];
  
  networkProfiles.forEach(profile => {
    it(`should sync successfully on ${profile.name}`, async () => {
      await device.setNetworkConditions(profile);
      
      // إضافة بيانات
      await addTestData(10);
      
      // محاولة المزامنة
      const result = await syncEngine.startSync({ timeout: 30000 });
      
      expect(result.status).toBe('success');
      expect(result.pushed).toBe(10);
    });
  });
});
```

### 4.2 اختبار التضارب
```typescript
describe('Conflict Resolution', () => {
  it('should resolve worker update conflict with last-write-wins', async () => {
    // إعداد: نفس العامل معدل على كلا الجهازين
    const worker = { id: 'w1', name: 'أحمد', dailyWage: 500 };
    
    // تعديل محلي
    await db.workers.upsert({
      ...worker,
      dailyWage: 600,
      updatedAt: 1000
    });
    
    // تعديل على السيرفر
    mockServer.addChange({
      table: 'workers',
      data: { ...worker, dailyWage: 550, updatedAt: 900 }
    });
    
    // مزامنة
    await syncEngine.startSync();
    
    // التحقق: المحلي يفوز (updatedAt أكبر)
    const result = await db.workers.findOne('w1').exec();
    expect(result.dailyWage).toBe(600);
  });
  
  it('should flag financial transfer conflict for manual resolution', async () => {
    // تحويل مالي معدل على كلا الجهازين
    const transfer = { id: 't1', amount: 10000 };
    
    await db.fundTransfers.upsert({
      ...transfer,
      amount: 15000,
      updatedAt: 1000,
      syncStatus: 'pending'
    });
    
    mockServer.addChange({
      table: 'fund_transfers',
      data: { ...transfer, amount: 12000, updatedAt: 900 }
    });
    
    await syncEngine.startSync();
    
    // التحقق: يجب أن يكون conflict
    const result = await db.fundTransfers.findOne('t1').exec();
    expect(result.syncStatus).toBe('conflict');
    expect(result.conflictData).toBeDefined();
  });
});
```

### 4.3 اختبار استرداد البيانات
```typescript
describe('Data Recovery', () => {
  it('should preserve all data after app restart', async () => {
    // إضافة بيانات
    await addTestData(100);
    const beforeCount = await db.workers.count().exec();
    
    // إعادة تشغيل التطبيق
    await app.terminate();
    await app.launch();
    
    // التحقق
    const afterCount = await db.workers.count().exec();
    expect(afterCount).toBe(beforeCount);
  });
  
  it('should preserve sync queue after app crash', async () => {
    // إضافة للطابور
    await syncQueue.add({ table: 'workers', operation: 'create', data: {} });
    await syncQueue.add({ table: 'projects', operation: 'update', data: {} });
    
    // محاكاة crash
    await app.crash();
    await app.launch();
    
    // التحقق
    const pendingCount = await syncQueue.count();
    expect(pendingCount).toBe(2);
  });
});
```

---

## 5. اختبار الأجهزة

### 5.1 الأجهزة المستهدفة
| الفئة | الأجهزة | Android |
|-------|--------|---------|
| منخفضة | Samsung A03, Redmi 9 | 11-12 |
| متوسطة | Samsung A52, Pixel 4a | 12-13 |
| عالية | Samsung S23, Pixel 7 | 13-14 |

### 5.2 سيناريوهات الاختبار
- [ ] تشغيل على Android 7.0 (API 24)
- [ ] تشغيل على Android 14 (API 34)
- [ ] شاشة 5 بوصة (صغيرة)
- [ ] شاشة 6.7 بوصة (كبيرة)
- [ ] تابلت 10 بوصة
- [ ] ذاكرة RAM 2GB
- [ ] ذاكرة RAM 8GB

---

## 6. اختبار RTL والعربية

### 6.1 قائمة التحقق
- [ ] اتجاه النص من اليمين لليسار
- [ ] محاذاة العناصر صحيحة
- [ ] الأيقونات الاتجاهية معكوسة (السهام)
- [ ] التمرير الأفقي معكوس
- [ ] الأرقام العربية تظهر صحيحة
- [ ] التواريخ بالتنسيق العربي
- [ ] لوحة المفاتيح العربية تعمل
- [ ] البحث بالعربية يعمل

### 6.2 أدوات الاختبار
- Android Lint RTL checks
- Layout Inspector
- اختبار يدوي على أجهزة حقيقية

---

## 7. تقارير الجودة

### 7.1 تقرير يومي
```markdown
## تقرير الجودة اليومي - [التاريخ]

### ملخص الاختبارات
- اختبارات الوحدات: X/Y ناجح (Z%)
- اختبارات التكامل: X/Y ناجح (Z%)
- اختبارات E2E: X/Y ناجح (Z%)

### الأخطاء المكتشفة
| # | الوصف | الخطورة | الحالة |
|---|-------|---------|--------|

### معايير الأداء
| المعيار | القيمة | الحالة |
|---------|--------|--------|

### التوصيات
-
```

### 7.2 مؤشرات الجودة (KPIs)
- Code Coverage: > 80%
- Test Pass Rate: > 95%
- Critical Bugs: 0
- High Bugs: < 5
- Performance Regressions: 0

---

## 8. أدوات الاختبار

| الأداة | الغرض |
|--------|-------|
| Jest | Unit & Integration tests |
| Detox | E2E tests |
| Android Profiler | Performance |
| Firebase Test Lab | Device testing |
| Crashlytics | Crash monitoring |

---
**التاريخ**: ديسمبر 2025
**الإصدار**: 1.0
