import { useEffect, useState, useCallback, useRef } from "react";
import { 
  Shield, 
  Database, 
  Bell, 
  Wifi, 
  WifiOff,
  MapPin,
  Camera,
  HardDrive,
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Zap,
  RefreshCw,
  Server,
  FileArchive,
  Smartphone,
  Globe,
  Vibrate,
  Battery,
  Signal,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { initializeDB, getDB } from "@/offline/db";
import { loadFullBackup } from "@/offline/sync";
import pako from "pako";

type CheckStatus = 'pending' | 'checking' | 'granted' | 'denied' | 'unavailable' | 'warning';
type PlatformType = 'web' | 'android' | 'ios';

interface SystemCheck {
  id: string;
  label: string;
  description: string;
  status: CheckStatus;
  required: boolean;
  details?: string;
  platforms: PlatformType[];
  expandedDetails?: Record<string, any>;
}

interface TableInfo {
  name: string;
  count: number;
  status: 'ok' | 'error';
}

const detectPlatform = (): PlatformType => {
  return 'web';
};

const getPlatformName = (platform: PlatformType): string => {
  switch (platform) {
    case 'android': return 'تطبيق أندرويد';
    case 'ios': return 'تطبيق iOS';
    default: return 'متصفح ويب';
  }
};

export default function SystemCheckPage() {
  const [, setLocation] = useLocation();
  const platform = detectPlatform();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [phase, setPhase] = useState<'permissions' | 'system' | 'complete'>('permissions');
  const [isRequesting, setIsRequesting] = useState(false);
  const [currentCheck, setCurrentCheck] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string>('');
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const allChecks: SystemCheck[] = [
    { id: 'storage', label: 'التخزين المحلي', description: 'حفظ البيانات على جهازك', status: 'pending', required: true, platforms: ['web'] },
    { id: 'notifications', label: 'الإشعارات', description: 'تنبيهات فورية للتحديثات', status: 'pending', required: true, platforms: ['web'] },
    { id: 'network', label: 'الاتصال بالإنترنت', description: 'مزامنة البيانات مع السيرفر', status: 'pending', required: true, platforms: ['web'] },
    { id: 'geolocation', label: 'الموقع الجغرافي', description: 'تحديد موقعك للخدمات', status: 'pending', required: false, platforms: ['web'] },
    { id: 'camera', label: 'الكاميرا', description: 'التقاط الصور والمستندات', status: 'pending', required: false, platforms: ['web'] },
    { id: 'vibration', label: 'الاهتزاز', description: 'تنبيهات بالاهتزاز', status: 'pending', required: false, platforms: ['web'] },
    { id: 'battery', label: 'حالة البطارية', description: 'معرفة مستوى البطارية', status: 'pending', required: false, platforms: ['web'] },
    { id: 'networkInfo', label: 'معلومات الشبكة', description: 'نوع الاتصال والسرعة', status: 'pending', required: false, platforms: ['web'] },
    { id: 'database', label: 'قاعدة البيانات', description: 'تهيئة التخزين الداخلي', status: 'pending', required: true, platforms: ['web'] },
    { id: 'server', label: 'السيرفر المركزي', description: 'الاتصال بالخادم الرئيسي', status: 'pending', required: false, platforms: ['web'] },
    { id: 'backup', label: 'النسخ الاحتياطية', description: 'البحث عن أحدث نسخة', status: 'pending', required: false, platforms: ['web'] },
    { id: 'emergency', label: 'نظام الطوارئ', description: 'التحقق من جاهزية وضع الطوارئ', status: 'pending', required: true, platforms: ['web'] },
    { id: 'tables', label: 'جداول البيانات', description: 'فحص سلامة الجداول', status: 'pending', required: true, platforms: ['web'] }
  ];
  
  const [checks, setChecks] = useState<SystemCheck[]>(
    allChecks.filter(c => c.platforms.includes(platform))
  );

  const updateCheck = useCallback((id: string, updates: Partial<SystemCheck>) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkStoragePermission = async (): Promise<CheckStatus> => {
    try {
      if ('storage' in navigator && 'persist' in navigator.storage) {
        const persisted = await navigator.storage.persisted();
        if (persisted) return 'granted';
      }
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      
      if ('indexedDB' in window) {
        return new Promise((resolve) => {
          const request = indexedDB.open('__test_db__', 1);
          request.onerror = () => resolve('denied');
          request.onsuccess = () => {
            request.result.close();
            indexedDB.deleteDatabase('__test_db__');
            resolve('granted');
          };
        });
      }
      return 'granted';
    } catch {
      return 'denied';
    }
  };

  const checkNotificationPermission = async (): Promise<CheckStatus> => {
    try {
      if (!('Notification' in window)) return 'unavailable';
      if (Notification.permission === 'granted') return 'granted';
      if (Notification.permission === 'denied') return 'denied';
      return 'pending';
    } catch {
      return 'unavailable';
    }
  };

  const checkNetworkStatus = async (): Promise<CheckStatus> => {
    if (!navigator.onLine) return 'denied';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch('/api/health', { method: 'GET', signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeoutId);
      return response.ok ? 'granted' : 'warning';
    } catch {
      return navigator.onLine ? 'warning' : 'denied';
    }
  };

  const checkGeolocationPermission = async (): Promise<CheckStatus> => {
    try {
      if (!('geolocation' in navigator)) return 'unavailable';
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        if (result.state === 'granted') return 'granted';
        if (result.state === 'denied') return 'denied';
      }
      return 'pending';
    } catch {
      return 'unavailable';
    }
  };

  const checkCameraPermission = async (): Promise<CheckStatus> => {
    try {
      if (!('mediaDevices' in navigator)) return 'unavailable';
      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (result.state === 'granted') return 'granted';
          if (result.state === 'denied') return 'denied';
        } catch { /* some browsers don't support camera permission query */ }
      }
      return 'pending';
    } catch {
      return 'unavailable';
    }
  };

  const checkVibration = async (): Promise<CheckStatus> => {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(1);
        return 'granted';
      }
      return 'unavailable';
    } catch {
      return 'unavailable';
    }
  };

  const checkBattery = async (): Promise<CheckStatus> => {
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        updateCheck('battery', { details: `${Math.round(battery.level * 100)}%` });
        return 'granted';
      }
      return 'unavailable';
    } catch {
      return 'unavailable';
    }
  };

  const checkNetworkInfo = async (): Promise<CheckStatus> => {
    try {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection) {
        updateCheck('networkInfo', { details: connection.effectiveType || connection.type });
        return 'granted';
      }
      return 'unavailable';
    } catch {
      return 'unavailable';
    }
  };

  const checkDatabase = async (): Promise<CheckStatus> => {
    try {
      await initializeDB();
      const db = await getDB();
      if (db) {
        const tables = ['projects', 'workers', 'financialTransfers', 'wells', 'wellExpenses'];
        let totalRecords = 0;
        const tableInfo: Record<string, number> = {};
        
        for (const table of tables) {
          try {
            const count = await db.count(table);
            totalRecords += count;
            tableInfo[table] = count;
          } catch { 
            tableInfo[table] = 0;
          }
        }
        
        const expandedInfo = {
          totalRecords: totalRecords,
          tables: tableInfo,
          timestamp: new Date().toLocaleString('ar-SA'),
          isEmpty: totalRecords === 0
        };
        
        updateCheck('database', { 
          details: totalRecords > 0 ? `${totalRecords} سجل` : 'فارغة',
          expandedDetails: expandedInfo
        });
      }
      return 'granted';
    } catch (error) {
      console.error('[DB Check] فشل:', error);
      return 'denied';
    }
  };

  const checkServer = async (): Promise<CheckStatus> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const startTime = performance.now();
      const response = await fetch('/api/health', { signal: controller.signal, cache: 'no-store' });
      const responseTime = Math.round(performance.now() - startTime);
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        const dbStatus = data.database === 'connected' ? 'متصل' : 'منفصل';
        const emergencyMode = localStorage.getItem("emergency_mode") === "true";
        
        const expandedInfo = {
          dbStatus,
          responseTime: `${responseTime}ms`,
          status: response.status,
          emergencyMode: emergencyMode ? 'مفعّل' : 'معطّل',
          timestamp: new Date().toLocaleString('ar-SA')
        };
        
        updateCheck('server', { 
          details: dbStatus,
          expandedDetails: expandedInfo
        });
        return data.database === 'connected' ? 'granted' : 'warning';
      }
      
      updateCheck('server', { 
        details: 'استجابة غير صحيحة',
        expandedDetails: {
          status: response.status,
          timestamp: new Date().toLocaleString('ar-SA')
        }
      });
      return 'warning';
    } catch (error) {
      updateCheck('server', { 
        details: 'غير متاح',
        expandedDetails: {
          error: (error as Error).message,
          timestamp: new Date().toLocaleString('ar-SA')
        }
      });
      return 'denied';
    }
  };

  const checkBackup = async (): Promise<CheckStatus> => {
    try {
      const backupKey = 'latest_backup_timestamp';
      const lastBackup = localStorage.getItem(backupKey);
      
      let serverBackupAvailable = false;
      let serverBackupTime = '';
      
      if (navigator.onLine) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          const response = await fetch('/api/sync/latest-backup', { 
            signal: controller.signal,
            cache: 'no-store'
          });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            if (data.timestamp) {
              serverBackupAvailable = true;
              serverBackupTime = new Date(data.timestamp).toLocaleString('ar-SA');
              localStorage.setItem(backupKey, data.timestamp);
              
              const expandedInfo = {
                source: 'خادم',
                timestamp: serverBackupTime,
                status: 'متاح'
              };
              
              updateCheck('backup', { 
                details: 'نسخة متاحة',
                expandedDetails: expandedInfo
              });
              return 'granted';
            }
          }
        } catch { /* Server not available */ }
      }
      
      if (lastBackup) {
        const backupDate = new Date(lastBackup);
        const now = new Date();
        const hoursDiff = (now.getTime() - backupDate.getTime()) / (1000 * 60 * 60);
        const backupDateStr = backupDate.toLocaleString('ar-SA');
        
        if (hoursDiff < 24) {
          const expandedInfo = {
            source: 'محلية',
            timestamp: backupDateStr,
            ageHours: Math.round(hoursDiff),
            status: 'حديثة'
          };
          
          updateCheck('backup', { 
            details: 'محلية حديثة',
            expandedDetails: expandedInfo
          });
          return 'granted';
        } else if (hoursDiff < 168) {
          const expandedInfo = {
            source: 'محلية',
            timestamp: backupDateStr,
            ageHours: Math.round(hoursDiff),
            status: 'قديمة'
          };
          
          updateCheck('backup', { 
            details: 'محلية قديمة',
            expandedDetails: expandedInfo
          });
          return 'warning';
        }
      }
      
      const expandedInfo = {
        source: 'غير متاح',
        status: 'لا توجد نسخة احتياطية'
      };
      
      updateCheck('backup', { 
        details: 'غير متاحة',
        expandedDetails: expandedInfo
      });
      return 'unavailable';
    } catch (error) {
      return 'unavailable';
    }
  };

  const checkEmergencySystem = async (): Promise<CheckStatus> => {
    try {
      const emergencyMode = localStorage.getItem("emergency_mode") === "true";
      const offlineData = localStorage.getItem("offline_queue");
      
      let queueCount = 0;
      if (offlineData) {
        try {
          const queue = JSON.parse(offlineData);
          queueCount = Array.isArray(queue) ? queue.length : 0;
        } catch {}
      }
      
      const db = await getDB();
      let hasLocalData = false;
      let projectsCount = 0;
      if (db) {
        projectsCount = await db.count('projects').catch(() => 0);
        hasLocalData = projectsCount > 0;
      }
      
      const expandedInfo = {
        mode: emergencyMode ? 'مفعّل' : 'معطّل',
        queueCount: queueCount,
        hasLocalData: hasLocalData,
        projectsCount: projectsCount,
        timestamp: new Date().toLocaleString('ar-SA')
      };
      
      if (emergencyMode) {
        updateCheck('emergency', { 
          details: `مفعّل (${queueCount} معلق)`,
          expandedDetails: expandedInfo
        });
        return 'warning';
      }
      
      if (hasLocalData) {
        updateCheck('emergency', { 
          details: 'جاهز للتفعيل',
          expandedDetails: expandedInfo
        });
        return 'granted';
      }
      
      updateCheck('emergency', { 
        details: 'يتطلب بيانات',
        expandedDetails: expandedInfo
      });
      return 'pending';
    } catch (error) {
      return 'denied';
    }
  };

  const checkTables = async (): Promise<CheckStatus> => {
    try {
      const db = await getDB();
      if (!db) {
        updateCheck('tables', { details: 'قاعدة غير متاحة' });
        return 'denied';
      }
      
      const requiredTables = ['projects', 'workers', 'financialTransfers', 'wells', 'wellExpenses', 'recentActivities'];
      const tableStatus: Record<string, number> = {};
      const tableDetails: TableInfo[] = [];
      let allTablesExist = true;
      
      for (const table of requiredTables) {
        try {
          const count = await db.count(table);
          tableStatus[table] = count;
          tableDetails.push({
            name: table,
            count: count,
            status: 'ok'
          });
        } catch (error) {
          tableStatus[table] = -1;
          tableDetails.push({
            name: table,
            count: 0,
            status: 'error'
          });
          allTablesExist = false;
        }
      }
      
      const totalRecords = Object.values(tableStatus).filter(c => c >= 0).reduce((a, b) => a + b, 0);
      const validTables = Object.values(tableStatus).filter(c => c >= 0).length;
      
      const expandedInfo = {
        tables: tableDetails,
        totalRecords: totalRecords,
        validTables: validTables,
        totalTables: requiredTables.length,
        timestamp: new Date().toLocaleString('ar-SA')
      };
      
      updateCheck('tables', { 
        details: `${validTables}/${requiredTables.length} جدول (${totalRecords} سجل)`,
        expandedDetails: expandedInfo
      });
      
      return allTablesExist ? 'granted' : 'warning';
    } catch (error) {
      console.error('[Tables Check] Error:', error);
      return 'denied';
    }
  };

  const requestStoragePermission = async (): Promise<CheckStatus> => {
    try {
      if ('storage' in navigator && 'persist' in navigator.storage) {
        await navigator.storage.persist();
      }
      await initializeDB();
      return 'granted';
    } catch {
      return 'denied';
    }
  };

  const requestNotificationPermission = async (): Promise<CheckStatus> => {
    try {
      if (!('Notification' in window)) return 'unavailable';
      const permission = await Notification.requestPermission();
      return permission === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'unavailable';
    }
  };

  const requestGeolocationPermission = async (): Promise<CheckStatus> => {
    try {
      if (!('geolocation' in navigator)) return 'unavailable';
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve('granted'),
          (error) => resolve(error.code === error.PERMISSION_DENIED ? 'denied' : 'warning'),
          { timeout: 10000, enableHighAccuracy: false }
        );
      });
    } catch {
      return 'unavailable';
    }
  };

  const requestCameraPermission = async (): Promise<CheckStatus> => {
    try {
      if (!('mediaDevices' in navigator)) return 'unavailable';
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        return 'granted';
      } catch (error: any) {
        if (error.name === 'NotAllowedError') return 'denied';
        if (error.name === 'NotFoundError') return 'unavailable';
        return 'denied';
      }
    } catch {
      return 'unavailable';
    }
  };

  const restoreFromBackup = async (): Promise<CheckStatus> => {
    try {
      await loadFullBackup();
      localStorage.setItem("setup_complete", "true");
      localStorage.setItem("latest_backup_timestamp", new Date().toISOString());
      return 'granted';
    } catch {
      localStorage.setItem("setup_complete", "true");
      return 'warning';
    }
  };

  const parseBackupFile = async (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const content = e.target?.result;
          
          if (file.name.endsWith('.gz') || file.name.endsWith('.gzip')) {
            const uint8Array = new Uint8Array(content as ArrayBuffer);
            const decompressed = pako.ungzip(uint8Array, { to: 'string' });
            
            if (file.name.includes('.sql')) {
              resolve({ type: 'sql', content: decompressed });
            } else {
              try {
                const jsonData = JSON.parse(decompressed);
                resolve({ type: 'json', content: jsonData });
              } catch {
                resolve({ type: 'sql', content: decompressed });
              }
            }
          } else if (file.name.endsWith('.sql')) {
            resolve({ type: 'sql', content: content as string });
          } else if (file.name.endsWith('.json')) {
            const jsonData = JSON.parse(content as string);
            resolve({ type: 'json', content: jsonData });
          } else {
            try {
              const jsonData = JSON.parse(content as string);
              resolve({ type: 'json', content: jsonData });
            } catch {
              resolve({ type: 'sql', content: content as string });
            }
          }
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('فشل في قراءة الملف'));
      
      if (file.name.endsWith('.gz') || file.name.endsWith('.gzip')) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const importBackupToIndexedDB = async (data: any): Promise<void> => {
    const db = await getDB();
    if (!db) throw new Error('قاعدة البيانات غير متاحة');
    
    if (data.type === 'json') {
      const backupData = data.content;
      const tables = ['projects', 'workers', 'financialTransfers', 'wells', 'wellExpenses', 'recentActivities'];
      
      for (const tableName of tables) {
        if (backupData[tableName] && Array.isArray(backupData[tableName])) {
          for (const record of backupData[tableName]) {
            try {
              await db.put(tableName, record);
            } catch (e) {
              console.warn(`[Import] تخطي سجل في ${tableName}:`, e);
            }
          }
        }
      }
    } else if (data.type === 'sql') {
      const sqlContent = data.content as string;
      const insertRegex = /INSERT INTO (\w+)\s*\((.*?)\)\s*VALUES\s*\((.*?)\);/gi;
      let match;
      
      while ((match = insertRegex.exec(sqlContent)) !== null) {
        const tableName = match[1].toLowerCase();
        const columns = match[2].split(',').map((c: string) => c.trim().replace(/"/g, ''));
        const valuesStr = match[3];
        
        const values = valuesStr.split(',').map((v: string) => {
          v = v.trim();
          if (v === 'NULL' || v === 'null') return null;
          if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1);
          if (!isNaN(Number(v))) return Number(v);
          return v;
        });
        
        const record: any = {};
        columns.forEach((col: string, idx: number) => {
          record[col] = values[idx];
        });
        
        try {
          await db.put(tableName, record);
        } catch (e) {
          console.warn(`[SQL Import] تخطي:`, e);
        }
      }
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setImportStatus('جاري تحليل الملف...');
    
    try {
      const parsed = await parseBackupFile(file);
      
      setImportStatus('جاري استيراد البيانات...');
      await importBackupToIndexedDB(parsed);
      
      localStorage.setItem("setup_complete", "true");
      localStorage.setItem("latest_backup_timestamp", new Date().toISOString());
      localStorage.setItem("backup_source", file.name);
      
      updateCheck('backup', { status: 'granted', details: 'تم الاستيراد' });
      updateCheck('database', { status: 'granted', details: 'تم التحديث' });
      
      setImportStatus('تم الاستيراد بنجاح!');
      setTimeout(() => setImportStatus(''), 3000);
    } catch (error: any) {
      console.error('[Import] خطأ:', error);
      setImportStatus(`فشل: ${error.message}`);
      setTimeout(() => setImportStatus(''), 5000);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getStatusText = (status: CheckStatus): string => {
    switch (status) {
      case 'granted': return 'مفعّل';
      case 'denied': return 'مرفوض';
      case 'pending': return 'بانتظار الموافقة';
      case 'unavailable': return 'غير متاح';
      case 'warning': return 'جزئي';
      default: return '';
    }
  };

  useEffect(() => {
    const alreadyGranted = localStorage.getItem("permissions_granted") === "true";
    const setupComplete = localStorage.getItem("setup_complete") === "true";
    
    if (alreadyGranted && setupComplete) {
      setLocation("/login");
      return;
    }

    const runInitialChecks = async () => {
      const permissionIds = ['storage', 'notifications', 'network', 'geolocation', 'camera', 'vibration', 'battery', 'networkInfo'];
      
      for (const id of permissionIds) {
        if (!checks.find(c => c.id === id)) continue;
        
        setCurrentCheck(id);
        let status: CheckStatus = 'pending';
        
        if (id === 'storage') status = await checkStoragePermission();
        else if (id === 'notifications') status = await checkNotificationPermission();
        else if (id === 'network') status = await checkNetworkStatus();
        else if (id === 'geolocation') status = await checkGeolocationPermission();
        else if (id === 'camera') status = await checkCameraPermission();
        else if (id === 'vibration') status = await checkVibration();
        else if (id === 'battery') status = await checkBattery();
        else if (id === 'networkInfo') status = await checkNetworkInfo();
        
        updateCheck(id, { status, details: checks.find(c => c.id === id)?.details || getStatusText(status) });
      }
      setCurrentCheck(null);
    };

    runInitialChecks();
  }, [setLocation, updateCheck, platform, checks]);

  const handleRequestAll = async () => {
    setIsRequesting(true);

    const permissionSteps = [
      { id: 'storage', fn: requestStoragePermission },
      { id: 'notifications', fn: requestNotificationPermission },
      { id: 'geolocation', fn: requestGeolocationPermission },
      { id: 'camera', fn: requestCameraPermission }
    ];

    for (const step of permissionSteps) {
      if (!checks.find(c => c.id === step.id)) continue;
      setCurrentCheck(step.id);
      updateCheck(step.id, { status: 'checking' });
      const result = await step.fn();
      updateCheck(step.id, { status: result, details: getStatusText(result) });
    }


    setPhase('system');

    const systemSteps = [
      { id: 'database', fn: checkDatabase },
      { id: 'server', fn: checkServer },
      { id: 'backup', fn: checkBackup },
      { id: 'emergency', fn: checkEmergencySystem },
      { id: 'tables', fn: checkTables }
    ];

    let dbResult: CheckStatus = 'denied';
    for (const step of systemSteps) {
      if (!checks.find(c => c.id === step.id)) continue;
      setCurrentCheck(step.id);
      updateCheck(step.id, { status: 'checking' });
      const result = await step.fn();
      if (step.id === 'database') dbResult = result;
      if (step.id === 'server' && result === 'denied') {
        localStorage.setItem("emergency_mode", "true");
      }
      updateCheck(step.id, { status: result, details: checks.find(c => c.id === step.id)?.details || getStatusText(result) });
    }

    const backupCheck = checks.find(c => c.id === 'backup');
    if (backupCheck && (backupCheck.status === 'granted' || backupCheck.status === 'warning')) {
      setCurrentCheck('backup');
      updateCheck('backup', { status: 'checking', details: 'جاري الاستعادة...' });
      const restoreResult = await restoreFromBackup();
      updateCheck('backup', { status: restoreResult, details: restoreResult === 'granted' ? 'تمت الاستعادة' : 'استعادة جزئية' });
    }

    setCurrentCheck(null);
    setIsRequesting(false);

    if (dbResult === 'granted' || dbResult === 'warning') {
      localStorage.setItem("permissions_granted", "true");
      localStorage.setItem("permissions_timestamp", new Date().toISOString());
      setPhase('complete');
      setTimeout(() => setLocation("/login"), 1500);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("permissions_granted", "true");
    localStorage.setItem("emergency_mode", "true");
    setLocation("/login");
  };

  const handleRefreshChecks = async () => {
    setIsRefreshing(true);
    setExpandedCheck(null);
    
    const systemChecksToRefresh = [
      { id: 'database', fn: checkDatabase },
      { id: 'server', fn: checkServer },
      { id: 'backup', fn: checkBackup },
      { id: 'emergency', fn: checkEmergencySystem },
      { id: 'tables', fn: checkTables }
    ];
    
    for (const step of systemChecksToRefresh) {
      const check = checks.find(c => c.id === step.id);
      if (!check) continue;
      
      setCurrentCheck(step.id);
      updateCheck(step.id, { status: 'checking' });
      
      try {
        const result = await step.fn();
        updateCheck(step.id, { status: result });
      } catch (error) {
        console.error(`[Refresh] Error checking ${step.id}:`, error);
        updateCheck(step.id, { status: 'warning' });
      }
    }
    
    setCurrentCheck(null);
    setIsRefreshing(false);
  };

  const getIcon = (id: string) => {
    const icons: Record<string, typeof Shield> = {
      storage: Database, notifications: Bell, network: Wifi, geolocation: MapPin,
      camera: Camera, database: HardDrive, server: Server, backup: RefreshCw,
      vibration: Vibrate, battery: Battery, networkInfo: Signal,
      emergency: Shield, tables: Database
    };
    return icons[id] || Shield;
  };

  const progress = Math.round((checks.filter(c => ['granted', 'warning', 'unavailable', 'denied'].includes(c.status)).length / checks.length) * 100);

  const permissionChecks = checks.filter(c => ['storage', 'notifications', 'network', 'geolocation', 'camera', 'vibration', 'battery', 'networkInfo'].includes(c.id));
  const systemChecks = checks.filter(c => ['database', 'server', 'backup', 'emergency', 'tables'].includes(c.id));
  const displayChecks = phase === 'permissions' ? permissionChecks : phase === 'system' ? systemChecks : checks;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 flex flex-col">
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
        <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          
          <div className="text-center mb-6">
            <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              {phase === 'complete' ? <CheckCircle2 className="w-8 h-8 text-green-500" /> : <Zap className="w-8 h-8 text-primary" />}
            </div>
            <h1 className="text-xl font-semibold text-foreground mb-1">
              {phase === 'permissions' ? 'الصلاحيات والفحص' : phase === 'system' ? 'إعداد النظام' : 'جاهز للعمل'}
            </h1>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              {isOnline ? <><Wifi className="w-3.5 h-3.5 text-green-500" /> متصل</> : <><WifiOff className="w-3.5 h-3.5 text-amber-500" /> غير متصل</>}
              <span className="text-muted-foreground/50">•</span>
              {platform === 'android' ? <><Smartphone className="w-3.5 h-3.5" /> أندرويد</> : 
               platform === 'ios' ? <><Smartphone className="w-3.5 h-3.5" /> iOS</> :
               <><Globe className="w-3.5 h-3.5" /> متصفح</>}
            </div>
          </div>

          <div className="space-y-2 mb-6 max-h-[50vh] overflow-y-auto">
            {displayChecks.map((check) => {
              const Icon = getIcon(check.id);
              const isActive = currentCheck === check.id;
              const isExpanded = expandedCheck === check.id;
              const hasDetails = check.expandedDetails && Object.keys(check.expandedDetails).length > 0;
              
              return (
                <div
                  key={check.id}
                  data-testid={`check-${check.id}`}
                  className={cn(
                    "rounded-xl border transition-all duration-200",
                    check.status === 'checking' && "border-primary/40 bg-primary/5",
                    check.status === 'granted' && "border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-900/10",
                    check.status === 'warning' && "border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10",
                    check.status === 'denied' && "border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10",
                    check.status === 'unavailable' && "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30",
                    check.status === 'pending' && "border-border/50 bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-3 p-3">
                    <div className={cn(
                      "flex items-center justify-center w-9 h-9 rounded-lg transition-colors shrink-0",
                      check.status === 'checking' && "bg-primary/15 text-primary",
                      check.status === 'granted' && "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
                      check.status === 'warning' && "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
                      check.status === 'denied' && "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
                      check.status === 'unavailable' && "bg-slate-100 dark:bg-slate-800 text-slate-400",
                      check.status === 'pending' && "bg-muted text-muted-foreground"
                    )}>
                      {check.status === 'checking' || isActive ? <Loader2 className="w-4 h-4 animate-spin" /> :
                       check.status === 'granted' ? <CheckCircle2 className="w-4 h-4" /> :
                       ['denied', 'warning'].includes(check.status) ? <AlertCircle className="w-4 h-4" /> :
                       <Icon className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-medium truncate", check.status === 'pending' ? "text-muted-foreground" : "text-foreground")}>
                            {check.label}
                          </span>
                          {check.required && check.status !== 'granted' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">مطلوب</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {check.details && (
                            <span className={cn("text-xs shrink-0",
                              check.status === 'granted' && "text-green-600 dark:text-green-400",
                              check.status === 'warning' && "text-amber-600 dark:text-amber-400",
                              check.status === 'denied' && "text-red-600 dark:text-red-400",
                              check.status === 'unavailable' && "text-slate-400"
                            )}>{check.details}</span>
                          )}
                          {hasDetails && (
                            <button
                              onClick={() => setExpandedCheck(isExpanded ? null : check.id)}
                              className="p-0.5 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors"
                              data-testid={`btn-expand-${check.id}`}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{check.description}</p>
                    </div>
                  </div>
                  
                  {isExpanded && hasDetails && (
                    <div className="px-3 pb-3 border-t border-current/10">
                      <div className="mt-3 space-y-2 text-xs">
                        {check.id === 'tables' && check.expandedDetails?.tables ? (
                          <>
                            {(check.expandedDetails.tables as TableInfo[]).map((table) => (
                              <div key={table.name} className="flex justify-between items-center p-2 bg-black/2.5 dark:bg-white/2.5 rounded">
                                <span className="font-medium">{table.name}</span>
                                <span className={table.status === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                  {table.count} سجل
                                </span>
                              </div>
                            ))}
                          </>
                        ) : (
                          Object.entries(check.expandedDetails || {}).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center p-2 bg-black/2.5 dark:bg-white/2.5 rounded">
                              <span className="text-muted-foreground">{key}</span>
                              <span className="font-medium">{String(value)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {phase !== 'complete' && (
            <div className="space-y-2">
              {phase === 'system' && (
                <Button 
                  data-testid="btn-refresh-checks"
                  variant="outline" 
                  className="w-full h-10" 
                  onClick={handleRefreshChecks} 
                  disabled={isRequesting || isRefreshing}
                >
                  {isRefreshing ? <><Loader2 className="w-4 h-4 animate-spin ml-2" />جاري إعادة الفحص...</> : <><RefreshCw className="w-4 h-4 ml-2" />إعادة الفحص</>}
                </Button>
              )}
              
              <Button data-testid="btn-request-all" className="w-full h-11" onClick={handleRequestAll} disabled={isRequesting || isRefreshing}>
                {isRequesting ? <><Loader2 className="w-4 h-4 animate-spin ml-2" />جاري الفحص والتفعيل...</> : <><Shield className="w-4 h-4 ml-2" />تفعيل الصلاحيات وبدء الإعداد</>}
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".sql,.json,.gz,.gzip,.backup"
                onChange={handleFileImport}
                className="hidden"
                data-testid="input-backup-file"
              />
              
              <Button
                data-testid="btn-import-backup"
                variant="outline"
                className="w-full h-10"
                onClick={() => fileInputRef.current?.click()}
                disabled={isRequesting}
              >
                <FileArchive className="w-4 h-4 ml-2" />
                استيراد نسخة احتياطية
              </Button>
              
              {importStatus && (
                <div className={cn(
                  "text-center text-sm p-2 rounded-lg",
                  importStatus.includes('فشل') ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" :
                  importStatus.includes('بنجاح') ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" :
                  "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                )}>
                  {importStatus}
                </div>
              )}
              
              <Button
                data-testid="btn-skip"
                variant="ghost"
                className="w-full h-9 text-sm text-muted-foreground"
                onClick={handleSkip}
                disabled={isRequesting}
              >
                تخطي (وضع الطوارئ)
              </Button>
            </div>
          )}

          {phase === 'complete' && (
            <div className="text-center p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-700 dark:text-green-300">تم إعداد النظام بنجاح</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">جاري التحويل...</p>
            </div>
          )}

          <p className="text-center text-[10px] text-muted-foreground/60 mt-6">
            v3.1 • {getPlatformName(platform)} • الصلاحيات محمية
          </p>
        </div>
      </div>
    </div>
  );
}
