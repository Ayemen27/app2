import { getDB } from './db';
import { syncOfflineData } from './sync';

/**
 * تحميل جميع البيانات من الخادم إلى IndexedDB
 */
export async function loadFullBackupToLocal(): Promise<boolean> {
  try {
    console.log('📥 [SyncLoader] بدء تحميل النسخة الاحتياطية الكاملة...');
    
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.warn('⚠️ [SyncLoader] لا توجد بيانات مصادقة');
      return false;
    }

    const response = await fetch(`${window.location.origin}/api/sync/full-backup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.error('❌ [SyncLoader] فشل الاتصال:', response.status);
      return false;
    }

    const { data, metadata } = await response.json();
    console.log(`📥 [SyncLoader] تم تحميل البيانات في ${metadata.duration}ms`);

    // حفظ البيانات في IndexedDB
    const db = await getDB();
    
    // قائمة المجموعات وبياناتها
    const stores = [
      { name: 'projects', data: data.projects },
      { name: 'workers', data: data.workers },
      { name: 'materials', data: data.materials },
      { name: 'suppliers', data: data.suppliers },
      { name: 'workerAttendance', data: data.workerAttendance },
      { name: 'materialPurchases', data: data.materialPurchases },
      { name: 'transportationExpenses', data: data.transportationExpenses },
      { name: 'fundTransfers', data: data.fundTransfers },
      { name: 'wells', data: data.wells },
      { name: 'projectTypes', data: data.projectTypes }
    ];

    // حفظ كل مجموعة
    for (const store of stores) {
      if (store.data && Array.isArray(store.data)) {
        const tx = db.transaction(store.name, 'readwrite');
        await tx.store.clear(); // حذف البيانات القديمة
        
        for (const record of store.data) {
          await tx.store.put(record);
        }
        
        await tx.done;
        console.log(`✅ [SyncLoader] تم حفظ ${store.data.length} في ${store.name}`);
      }
    }

    // حفظ metadata المزامنة
    const metadataTx = db.transaction('syncMetadata', 'readwrite');
    await metadataTx.store.put({
      key: 'lastSync',
      timestamp: metadata.timestamp,
      version: metadata.version,
      recordCount: Object.values(metadata.recordCounts).reduce((a, b) => a + (b as number), 0)
    });
    await metadataTx.done;

    console.log('✅ [SyncLoader] تم حفظ جميع البيانات محلياً بنجاح');
    return true;
  } catch (error) {
    console.error('❌ [SyncLoader] خطأ في تحميل البيانات:', error);
    return false;
  }
}

/**
 * فحص ما إذا كانت البيانات محدثة أم لا
 */
export async function isDataUpToDate(): Promise<boolean> {
  try {
    const db = await getDB();
    const metadata = await db.get('syncMetadata', 'lastSync');
    
    if (!metadata) return false;
    
    // إذا آخر مزامنة قبل أكثر من ساعة، فهي قديمة
    const hourAgo = Date.now() - (60 * 60 * 1000);
    return metadata.timestamp > hourAgo;
  } catch {
    return false;
  }
}

/**
 * تحميل البيانات عند بدء التطبيق (إذا لم تكن موجودة)
 */
export async function initializeSyncOnAppStart(): Promise<void> {
  try {
    const isUpToDate = await isDataUpToDate();
    
    if (!isUpToDate && navigator.onLine) {
      console.log('🔄 [SyncLoader] البيانات قديمة، جاري التحميل...');
      await loadFullBackupToLocal();
    }
  } catch (error) {
    console.error('❌ [SyncLoader] خطأ في التهيئة:', error);
  }
}
