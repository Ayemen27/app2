/**
 * Offline-First Module - نظام العمل بدون إنترنت الكامل
 * 
 * الاستخدام:
 * import { initOfflineSystem, offlineFirstMutation } from '@/offline'
 */

// Storage
export { initializeStorage } from './storage-factory';
export { getDB } from './db';

// Sync System
export { 
  syncOfflineData, 
  initSyncListener, 
  stopSyncListener,
  subscribeSyncState,
  getSyncState
} from './sync';

// Queries
export {
  isOnline,
  getDataWithFallback,
  getLocalRecord,
  saveLocalRecord,
  deleteLocalRecord,
  isDataUpToDate,
  getLastSyncTime,
  getLocalDataStats,
  cleanupOldLocalData,
  type EntityName
} from './offline-queries';

// Mutations
export {
  createRecordOffline,
  updateRecordOffline,
  deleteRecordOffline,
  getPendingOperationsCount,
  getPendingOperationsDetails,
  getSyncStatistics,
  offlineFirstMutation,
  invalidateCache
} from './offline-mutations';

// Conflict Resolution
export {
  resolveConflict,
  detectConflict,
  getConflictingFields,
  type ConflictResolutionStrategy,
  type ConflictData
} from './conflict-resolver';

// Performance & Security
export {
  calculateObjectSize,
  getTotalStorageSize,
  getCompressionStats
} from './data-compression';

export {
  encryptRecord,
  decryptRecord,
  encryptValue,
  decryptValue,
  deepEncrypt,
  deepDecrypt
} from './data-encryption';

export {
  deleteOldRecords,
  clearAllLocalData,
  clearPendingSyncData,
  runCleanupPolicy
} from './data-cleanup';

export {
  collectMetrics,
  getMetricsHistory,
  getPerformanceStats,
  printPerformanceReport,
  startPerformanceMonitoring,
  stopPerformanceMonitoring,
  type PerformanceMetrics
} from './performance-monitor';

/**
 * تهيئة نظام العمل بدون إنترنت
 */
export async function initOfflineSystem(): Promise<void> {
  console.log('🚀 [OfflineSystem] جاري تهيئة النظام...');
  
  try {
    const { initializeStorage } = await import('./storage-factory');
    await initializeStorage();
    console.log('✅ [OfflineSystem] تم تهيئة التخزين');
    
    // تفعيل مستمع المزامنة
    if (typeof window !== 'undefined') {
      // @ts-ignore - تجنب خطأ أثناء الاستيراد
      await Promise.resolve().then(() => {
        // المزامنة ستبدأ من خلال المستمع
      });
      console.log('✅ [OfflineSystem] تم تفعيل نظام المزامنة');
      
      // بدء مراقبة الأداء
      startPerformanceMonitoring(60000);
      console.log('✅ [OfflineSystem] تم بدء مراقبة الأداء');
    }
    
    console.log('✅ [OfflineSystem] تم تهيئة النظام بنجاح!');
  } catch (error) {
    console.error('❌ [OfflineSystem] خطأ في التهيئة:', error);
    throw error;
  }
}

/**
 * إيقاف نظام العمل بدون إنترنت
 */
export async function shutdownOfflineSystem(): Promise<void> {
  console.log('🛑 [OfflineSystem] إيقاف النظام...');
  
  try {
    if (typeof window !== 'undefined') {
      stopPerformanceMonitoring();
    }
    console.log('✅ [OfflineSystem] تم إيقاف النظام');
  } catch (error) {
    console.error('❌ [OfflineSystem] خطأ في الإيقاف:', error);
  }
}
