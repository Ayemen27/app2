import { pool, checkDBConnection } from '../db';
import { circuitBreaker } from './CircuitBreaker';
import { smartConnectionManager } from './smart-connection-manager';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  uptime: number;
  checks: {
    database: { status: boolean; latency?: number; error?: string };
    memory: { status: boolean; usage: number; limit: number };
    circuitBreakers: { status: string; open: number; total: number };
    connections: { local: boolean; supabase: boolean };
  };
  emergencyMode: boolean;
  platform: 'web' | 'android' | 'server';
}

class HealthMonitor {
  private static instance: HealthMonitor;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastHealthStatus: HealthStatus | null = null;
  private healthHistory: HealthStatus[] = [];
  private maxHistorySize = 100;
  private checkIntervalMs = 30000;
  private consecutiveFailures = 0;
  private maxConsecutiveFailures = 3;
  private onHealthChangeCallbacks: ((status: HealthStatus) => void)[] = [];

  private constructor() {}

  static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor();
    }
    return HealthMonitor.instance;
  }

  start(intervalMs?: number): void {
    if (this.healthCheckInterval) {
      console.log('⚠️ [HealthMonitor] المراقب يعمل بالفعل');
      return;
    }

    if (intervalMs) {
      this.checkIntervalMs = intervalMs;
    }

    console.log(`🏥 [HealthMonitor] بدء المراقبة الدورية كل ${this.checkIntervalMs / 1000} ثانية`);
    
    this.runHealthCheck();
    
    this.healthCheckInterval = setInterval(() => {
      this.runHealthCheck();
    }, this.checkIntervalMs);
  }

  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('🛑 [HealthMonitor] تم إيقاف المراقبة');
    }
  }

  async runHealthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    const memoryCheck = this.checkMemory();
    const circuitBreakerCheck = this.checkCircuitBreakers();
    
    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    if (!dbCheck.status || !memoryCheck.status || circuitBreakerCheck.status !== 'healthy') {
      overallStatus = 'degraded';
    }

    if (!dbCheck.status && !memoryCheck.status) {
      overallStatus = 'critical';
    }

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: { ...dbCheck },
        memory: {
          ...memoryCheck,
          status: memoryCheck.status
        },
        circuitBreakers: { ...circuitBreakerCheck, status: circuitBreakerCheck.status },
        connections: {
          local: true,
          supabase: true
        }
      },
      emergencyMode: (global as any).isEmergencyMode || false,
      platform: process.env.PLATFORM === 'android' ? 'android' : 'server'
    };

    this.lastHealthStatus = healthStatus;
    this.addToHistory(healthStatus);

    if (this.lastHealthStatus?.status !== overallStatus) {
      this.notifyHealthChange(healthStatus);
    }

    const duration = Date.now() - startTime;
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🏥 [HealthMonitor] فحص اكتمل في ${duration}ms - الحالة: ${overallStatus}`);
    }

    return healthStatus;
  }

  private async checkDatabase(): Promise<{ status: boolean; latency?: number; error?: string }> {
    const start = Date.now();
    try {
      const isConnected = await checkDBConnection();
      const latency = Date.now() - start;
      
      if (latency > 1000) {
        console.warn(`⚠️ [Database] Slow connection detected: ${latency}ms`);
      }

      return {
        status: isConnected,
        latency
      };
    } catch (error: any) {
      console.error('❌ [Database] Connection error:', error.message);
      return {
        status: false,
        latency: Date.now() - start,
        error: error.message
      };
    }
  }

  private checkMemory(): { status: boolean; usage: number; limit: number } {
    const memoryUsage = process.memoryUsage();
    const heapUsed = memoryUsage.heapUsed;
    const heapTotal = memoryUsage.heapTotal;
    const usagePercent = (heapUsed / heapTotal) * 100;
    
    return {
      status: usagePercent < 90,
      usage: Math.round(heapUsed / 1024 / 1024),
      limit: Math.round(heapTotal / 1024 / 1024)
    };
  }

  private checkCircuitBreakers(): { status: string; open: number; total: number } {
    const report = circuitBreaker.getHealthReport();
    
    return {
      status: report.overallHealth,
      open: report.openBreakers.length,
      total: report.totalBreakers
    };
  }

  private addToHistory(status: HealthStatus): void {
    this.healthHistory.push(status);
    
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory.shift();
    }
  }

  private notifyHealthChange(status: HealthStatus): void {
    this.onHealthChangeCallbacks.forEach(cb => {
      try {
        cb(status);
      } catch (e) {
        console.error('❌ [HealthMonitor] خطأ في callback:', e);
      }
    });
  }

  onHealthChange(callback: (status: HealthStatus) => void): void {
    this.onHealthChangeCallbacks.push(callback);
  }

  getLastStatus(): HealthStatus | null {
    return this.lastHealthStatus;
  }

  getHistory(limit?: number): HealthStatus[] {
    if (limit) {
      return this.healthHistory.slice(-limit);
    }
    return [...this.healthHistory];
  }

  getMetrics(): {
    uptime: number;
    totalChecks: number;
    healthyChecks: number;
    degradedChecks: number;
    criticalChecks: number;
    averageLatency: number;
  } {
    const healthy = this.healthHistory.filter(h => h.status === 'healthy').length;
    const degraded = this.healthHistory.filter(h => h.status === 'degraded').length;
    const critical = this.healthHistory.filter(h => h.status === 'critical').length;
    
    const latencies = this.healthHistory
      .map(h => h.checks.database.latency)
      .filter((l): l is number => l !== undefined);
    
    const avgLatency = latencies.length > 0 
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
      : 0;

    return {
      uptime: process.uptime(),
      totalChecks: this.healthHistory.length,
      healthyChecks: healthy,
      degradedChecks: degraded,
      criticalChecks: critical,
      averageLatency: Math.round(avgLatency)
    };
  }

  async checkIntegrity(): Promise<{
    status: 'success' | 'warning' | 'failed';
    issues: string[];
    tablesChecked: number;
    totalRecords: number;
  }> {
    const issues: string[] = [];
    // Verify all active tables in the system
    const tables = [
      'users', 'projects', 'workers', 'wells', 'suppliers', 
      'materials', 'metrics', 'audit_logs', 'crashes',
      'fund_transfers', 'worker_attendance'
    ];
    let tablesChecked = 0;
    let totalRecords = 0;

    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT count(*) FROM "${table}"`);
        const count = parseInt(result.rows[0].count);
        totalRecords += count;
        tablesChecked++;
      } catch (e: any) {
        issues.push(`جدول "${table}" غير متاح: ${e.message}`);
      }
    }

    const result = (global as any).lastIntegrityCheck = {
      status: issues.length === 0 ? 'success' : issues.length < 3 ? 'warning' : 'failed',
      issues,
      tablesChecked,
      totalRecords,
      lastChecked: new Date().toISOString()
    };

    return result;
  }
}

export const healthMonitor = HealthMonitor.getInstance();
export { HealthMonitor, HealthStatus };
