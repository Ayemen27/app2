/**
 * سكريبت استيراد البيانات بكميات كبيرة
 * Bulk Data Import Script
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';
const EMAIL = 'binarjoinanalytic@gmail.com';
const PASSWORD = 'your-password'; // سيتم تغييره

let authToken = '';

// === التحقق المصادقة ===
async function authenticate() {
  try {
    console.log('🔐 جاري تسجيل الدخول...');
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });
    
    if (!response.ok) {
      throw new Error(`فشل تسجيل الدخول: ${response.statusText}`);
    }
    
    const data: any = await response.json();
    authToken = data.token || data.accessToken;
    console.log('✅ تم التحقق المصادقة');
    return true;
  } catch (error) {
    console.error('❌ خطأ في المصادقة:', error);
    return false;
  }
}

// === إضافة عامل ===
async function addWorker(name: string, type: string, dailyWage: number) {
  try {
    const response = await fetch(`${API_BASE}/workers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        name,
        type,
        dailyWage,
        notes: ''
      })
    });
    
    if (!response.ok) {
      console.error(`❌ فشل إضافة العامل ${name}`);
      return null;
    }
    
    const data: any = await response.json();
    console.log(`✅ تم إضافة العامل: ${name}`);
    return data.data?.id || data.data;
  } catch (error) {
    console.error(`❌ خطأ في إضافة العامل ${name}:`, error);
    return null;
  }
}

// === إضافة مصروف يومي ===
async function addDailyExpense(date: string, amount: number, description: string, category: string) {
  try {
    const response = await fetch(`${API_BASE}/daily-expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        date,
        amount,
        description,
        category,
        notes: ''
      })
    });
    
    if (!response.ok) {
      console.error(`❌ فشل إضافة المصروف: ${description}`);
      return null;
    }
    
    console.log(`✅ تم إضافة المصروف: ${description} - ${amount}`);
    return true;
  } catch (error) {
    console.error(`❌ خطأ في إضافة المصروف:`, error);
    return null;
  }
}

// === إضافة مادة ===
async function addMaterial(date: string, name: string, quantity: number, unitPrice: number, totalPrice: number) {
  try {
    const response = await fetch(`${API_BASE}/materials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        date,
        name,
        quantity,
        unitPrice,
        totalPrice,
        notes: '',
        supplierId: null
      })
    });
    
    if (!response.ok) {
      console.error(`❌ فشل إضافة المادة: ${name}`);
      return null;
    }
    
    console.log(`✅ تم إضافة المادة: ${name}`);
    return true;
  } catch (error) {
    console.error(`❌ خطأ في إضافة المادة:`, error);
    return null;
  }
}

// === البيانات الرئيسية ===
async function importAllData() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  🚀 بدء استيراد البيانات الشاملة      ║');
  console.log('╚════════════════════════════════════════╝\n');

  // === 24/11 ===
  console.log('\n📅 24/11 - إضافة البيانات...\n');
  
  // العمال
  await addWorker('وهب الله', 'نجار معلم', 6000);
  await addWorker('محمد يحيى', 'نجار معلم', 6000);
  await addWorker('السمهري', 'عامل', 5000);
  
  // مصاريف 24/11
  await addDailyExpense('2025-11-24', 30000, 'بترول لسيارتك', 'وقود');
  await addDailyExpense('2025-11-24', 10000, 'بترول لشاص نقل المعدات', 'وقود');
  await addDailyExpense('2025-11-24', 6000, 'غداء', 'أكل وشرب');

  // === 25/11 ===
  console.log('\n📅 25/11 - إضافة البيانات...\n');
  await addDailyExpense('2025-11-25', 5000, 'السمهري (معه اليوم)', 'رواتب يومية');

  // === 26/11 ===
  console.log('\n📅 26/11 - إضافة البيانات...\n');
  
  // مواد
  await addMaterial('2025-11-26', 'خشب (6 حزم)', 6, 5500, 33000);
  
  // مصاريف تشغيل
  await addDailyExpense('2025-11-26', 33000, 'بترول لسيارة الهايلوكس', 'وقود');
  await addDailyExpense('2025-11-26', 9500, 'بترول لشاص', 'وقود');
  await addDailyExpense('2025-11-26', 18000, 'تغيير زيت للهايلوكس', 'صيانة');
  
  // رواتب يومية ومصاريف
  await addDailyExpense('2025-11-26', 3000, 'صبوح انت والعمال', 'أكل وشرب');
  await addDailyExpense('2025-11-26', 2000, 'السمهري', 'رواتب يومية');
  await addDailyExpense('2025-11-26', 2000, 'أركان', 'رواتب يومية');
  await addDailyExpense('2025-11-26', 2000, 'وليد', 'رواتب يومية');
  await addDailyExpense('2025-11-26', 5000, 'قات عمار', 'أكل وشرب');
  await addDailyExpense('2025-11-26', 5000, 'قات زين', 'أكل وشرب');
  await addDailyExpense('2025-11-26', 1000, 'ماء وثلج', 'أكل وشرب');
  await addDailyExpense('2025-11-26', 5000, 'سعيد الحداد', 'رواتب يومية');
  await addDailyExpense('2025-11-26', 2000, 'مع المنظف', 'أخرى');
  await addDailyExpense('2025-11-26', 2000, 'المطوع', 'رواتب يومية');
  
  // أدوات
  await addDailyExpense('2025-11-26', 2500, 'مطرقة + قص + وتر + مسامير', 'أدوات');

  // === 27/11 ===
  console.log('\n📅 27/11 - إضافة البيانات...\n');
  
  // رواتب العمال
  await addDailyExpense('2025-11-27', 5000, 'النجار', 'رواتب يومية');
  await addDailyExpense('2025-11-27', 1000, 'عمار', 'رواتب يومية');
  await addDailyExpense('2025-11-27', 10000, 'النجارين (دفعة أخرى)', 'رواتب يومية');
  await addDailyExpense('2025-11-27', 4000, 'وليد', 'رواتب يومية');
  await addDailyExpense('2025-11-27', 4000, 'أركان', 'رواتب يومية');
  await addDailyExpense('2025-11-27', 4000, 'المطوع', 'رواتب يومية');
  await addDailyExpense('2025-11-27', 3000, 'السمهري', 'رواتب يومية');
  await addDailyExpense('2025-11-27', 5000, 'سعيد', 'رواتب يومية');
  await addDailyExpense('2025-11-27', 3000, 'الملحم (تلحيم 6 قواعد)', 'رواتب يومية');
  
  // أكل وشرب
  await addDailyExpense('2025-11-27', 3500, 'عشاء', 'أكل وشرب');
  await addDailyExpense('2025-11-27', 500, 'ماء', 'أكل وشرب');
  await addDailyExpense('2025-11-27', 5000, 'صبوح انت والعمال', 'أكل وشرب');
  await addDailyExpense('2025-11-27', 4500, 'غداء', 'أكل وشرب');
  
  // مصاريف أخرى
  await addDailyExpense('2025-11-27', 6000, 'مع المطوع العامل', 'أخرى');
  await addDailyExpense('2025-11-27', 3000, 'مع الوكندة', 'أخرى');
  await addDailyExpense('2025-11-27', 1000, 'ماء', 'أكل وشرب');
  await addDailyExpense('2025-11-27', 2000, 'مسامير ومتر وخيط', 'أدوات');
  
  // مواد
  await addMaterial('2025-11-27', 'ديكور (4 حبات أبو 4 ملي)', 4, 5000, 20000);
  await addMaterial('2025-11-27', 'طفش (6 حبات @ 330)', 6, 330, 1980);
  
  // تصفية حساب العمال
  await addDailyExpense('2025-11-27', 16000, 'تصفية حساب العمال (باقي حسابهم)', 'رواتب يومية');

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  ✅ تم إضافة جميع البيانات بنجاح!    ║');
  console.log('╚════════════════════════════════════════╝\n');
}

// === التشغيل ===
(async () => {
  if (await authenticate()) {
    await importAllData();
  } else {
    console.log('❌ فشل الاتصال - تحقق من بيانات المصادقة');
    process.exit(1);
  }
})();
