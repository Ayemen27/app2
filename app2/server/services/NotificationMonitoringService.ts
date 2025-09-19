/**
 * خدمة مراقبة نظام الإشعارات المتقدم
 * تدعم structured logging ومراقبة الأداء والتنبيهات
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

export interface NotificationMetric {
  id: string;
  notificationId?: string;
  recipientId: string;
  deliveryMethod: string;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  sentAt: Date;
  latencyMs: number;
  failureReason?: string;
  retryCount?: number;
  channelUsed: string;
  createdAt: Date;
}

export interface SystemAlert {
  type: 'performance' | 'failure_rate' | 'queue_backup' | 'system_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface PerformanceMetrics {
  totalNotifications: number;
  successRate: number;
  averageLatency: number;
  failureRate: number;
  queueSize: number;
  processingTime: number;
  channelBreakdown: Record<string, number>;
  hourlyTrends: Array<{ hour: number; count: number; successRate: number }>;
}

export class NotificationMonitoringService {
  private alertThresholds = {
    successRate: 0.95, // 95%
    maxLatency: 5000, // 5 ثواني
    maxQueueSize: 1000,
    maxFailureRate: 0.05 // 5%
  };

  /**
   * تسجيل حدث في النظام مع structured logging
   */
  async logEvent(
    level: 'info' | 'warn' | 'error' | 'debug',
    category: string,
    message: string,
    metadata: Record<string, any> = {},
    requestId?: string,
    userId?: string,
    notificationId?: string
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      requestId: requestId || this.generateRequestId(),
      userId,
      notificationId,
      metadata,
      pid: process.pid,
      service: 'notification-system'
    };

    // تسجيل في الكونسول بصيغة JSON
    console.log(JSON.stringify(logEntry));

    // حفظ في قاعدة البيانات للأحداث المهمة
    if (level === 'error' || level === 'warn') {
      await this.saveLogToDatabase(logEntry);
    }
  }

  /**
   * حفظ السجل في قاعدة البيانات
   */
  private async saveLogToDatabase(logEntry: any): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO error_logs (
          error_level, category, message, metadata, 
          created_at
        ) VALUES (
          ${logEntry.level}, ${logEntry.category}, ${logEntry.message}, 
          ${JSON.stringify(logEntry.metadata)}, 
          ${new Date()}
        )
      `);
    } catch (error) {
      console.error('فشل في حفظ السجل في قاعدة البيانات:', error);
    }
  }

  /**
   * جمع مقاييس الأداء الحالية
   */
  async getPerformanceMetrics(timeRange: 'hour' | 'day' | 'week' = 'day'): Promise<PerformanceMetrics> {
    const hours = timeRange === 'hour' ? 1 : timeRange === 'day' ? 24 : 168;
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    try {
      // إحصائيات عامة
      const generalStats = await db.execute(sql`
        SELECT 
          COUNT(*) as total_notifications,
          COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          AVG(latency_ms) as avg_latency,
          MAX(latency_ms) as max_latency
        FROM notification_metrics 
        WHERE created_at >= ${startTime}
      `);

      // إحصائيات القنوات
      const channelStats = await db.execute(sql`
        SELECT 
          channel_used,
          COUNT(*) as count,
          COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful
        FROM notification_metrics 
        WHERE created_at >= ${startTime}
        GROUP BY channel_used
      `);

      // حجم الطابور الحالي
      const queueStats = await db.execute(sql`
        SELECT 
          COUNT(*) as queue_size,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing
        FROM notification_queue
      `);

      // الاتجاهات بالساعة
      const hourlyTrends = await db.execute(sql`
        SELECT 
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as count,
          COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful
        FROM notification_metrics 
        WHERE created_at >= ${startTime}
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
      `);

      const generalRow = generalStats.rows[0];
      const queueRow = queueStats.rows[0];

      const totalNotifications = Number(generalRow.total_notifications) || 0;
      const successfulNotifications = Number(generalRow.successful) || 0;
      const failedNotifications = Number(generalRow.failed) || 0;

      const successRate = totalNotifications > 0 ? successfulNotifications / totalNotifications : 1;
      const failureRate = totalNotifications > 0 ? failedNotifications / totalNotifications : 0;

      // تجميع إحصائيات القنوات
      const channelBreakdown: Record<string, number> = {};
      channelStats.rows.forEach(row => {
        channelBreakdown[row.channel_used as string] = Number(row.count);
      });

      // تجميع الاتجاهات بالساعة
      const trends = hourlyTrends.rows.map(row => ({
        hour: Number(row.hour),
        count: Number(row.count),
        successRate: Number(row.count) > 0 ? Number(row.successful) / Number(row.count) : 0
      }));

      return {
        totalNotifications,
        successRate,
        averageLatency: Number(generalRow.avg_latency) || 0,
        failureRate,
        queueSize: Number(queueRow.queue_size) || 0,
        processingTime: Number(generalRow.max_latency) || 0,
        channelBreakdown,
        hourlyTrends: trends
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير محدد';
      await this.logEvent('error', 'monitoring', 'فشل في جمع مقاييس الأداء', { error: errorMessage });
      throw error;
    }
  }

  /**
   * فحص التنبيهات وإرسال التحذيرات
   */
  async checkAlerts(): Promise<SystemAlert[]> {
    const alerts: SystemAlert[] = [];
    
    try {
      const metrics = await this.getPerformanceMetrics('hour');

      // فحص معدل النجاح
      if (metrics.successRate < this.alertThresholds.successRate) {
        alerts.push({
          type: 'failure_rate',
          severity: metrics.successRate < 0.85 ? 'critical' : 'high',
          message: `معدل نجاح الإشعارات منخفض: ${(metrics.successRate * 100).toFixed(2)}%`,
          metadata: { 
            currentRate: metrics.successRate, 
            threshold: this.alertThresholds.successRate,
            totalNotifications: metrics.totalNotifications
          },
          timestamp: new Date()
        });
      }

      // فحص زمن الاستجابة
      if (metrics.averageLatency > this.alertThresholds.maxLatency) {
        alerts.push({
          type: 'performance',
          severity: metrics.averageLatency > 10000 ? 'critical' : 'medium',
          message: `زمن الاستجابة مرتفع: ${metrics.averageLatency.toFixed(0)}ms`,
          metadata: { 
            currentLatency: metrics.averageLatency, 
            threshold: this.alertThresholds.maxLatency 
          },
          timestamp: new Date()
        });
      }

      // فحص حجم الطابور
      if (metrics.queueSize > this.alertThresholds.maxQueueSize) {
        alerts.push({
          type: 'queue_backup',
          severity: metrics.queueSize > 2000 ? 'critical' : 'high',
          message: `طابور الإشعارات مزدحم: ${metrics.queueSize} عنصر`,
          metadata: { 
            currentSize: metrics.queueSize, 
            threshold: this.alertThresholds.maxQueueSize 
          },
          timestamp: new Date()
        });
      }

      // فحص معدل الفشل
      if (metrics.failureRate > this.alertThresholds.maxFailureRate) {
        alerts.push({
          type: 'failure_rate',
          severity: metrics.failureRate > 0.15 ? 'critical' : 'medium',
          message: `معدل فشل الإشعارات مرتفع: ${(metrics.failureRate * 100).toFixed(2)}%`,
          metadata: { 
            currentRate: metrics.failureRate, 
            threshold: this.alertThresholds.maxFailureRate 
          },
          timestamp: new Date()
        });
      }

      // تسجيل التنبيهات
      for (const alert of alerts) {
        await this.logEvent(
          alert.severity === 'critical' ? 'error' : 'warn',
          'system_alert',
          alert.message,
          alert.metadata
        );
      }

      return alerts;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير محدد';
      await this.logEvent('error', 'monitoring', 'فشل في فحص التنبيهات', { error: errorMessage });
      return [{
        type: 'system_error',
        severity: 'critical',
        message: 'فشل في نظام المراقبة',
        metadata: { error: errorMessage },
        timestamp: new Date()
      }];
    }
  }

  /**
   * تسجيل مقياس جديد
   */
  async recordMetric(metric: Omit<NotificationMetric, 'id' | 'createdAt'>): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO notification_metrics (
          notification_id, recipient_id, delivery_method, status, 
          sent_at, latency_ms, failure_reason, retry_count, channel_used
        ) VALUES (
          ${metric.notificationId || null}, ${metric.recipientId}, 
          ${metric.deliveryMethod}, ${metric.status}, ${metric.sentAt}, 
          ${metric.latencyMs}, ${metric.failureReason || null}, 
          ${metric.retryCount || 0}, ${metric.channelUsed}
        )
      `);

      await this.logEvent(
        'info', 
        'metric_recorded', 
        'تم تسجيل مقياس جديد',
        { 
          status: metric.status, 
          channel: metric.channelUsed, 
          latency: metric.latencyMs 
        },
        undefined,
        metric.recipientId,
        metric.notificationId
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير محدد';
      await this.logEvent(
        'error', 
        'metric_recording', 
        'فشل في تسجيل المقياس', 
        { error: errorMessage, metric }
      );
      throw error;
    }
  }

  /**
   * تنظيف البيانات القديمة
   */
  async cleanupOldData(retentionDays: number = 30): Promise<void> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    
    try {
      // تنظيف المقاييس القديمة
      const metricsResult = await db.execute(sql`
        DELETE FROM notification_metrics 
        WHERE created_at < ${cutoffDate}
      `);

      // تنظيف السجلات القديمة
      const logsResult = await db.execute(sql`
        DELETE FROM error_logs 
        WHERE created_at < ${cutoffDate}
      `);

      await this.logEvent(
        'info', 
        'cleanup', 
        'تم تنظيف البيانات القديمة',
        { 
          retentionDays,
          deletedMetrics: metricsResult.rowCount || 0,
          deletedLogs: logsResult.rowCount || 0
        }
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير محدد';
      await this.logEvent(
        'error', 
        'cleanup', 
        'فشل في تنظيف البيانات القديمة', 
        { error: errorMessage }
      );
      throw error;
    }
  }

  /**
   * تقرير حالة النظام
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    metrics: PerformanceMetrics;
    alerts: SystemAlert[];
    recommendations: string[];
  }> {
    try {
      const metrics = await this.getPerformanceMetrics('hour');
      const alerts = await this.checkAlerts();
      
      // تحديد حالة النظام
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (alerts.some(a => a.severity === 'critical')) {
        status = 'critical';
      } else if (alerts.some(a => a.severity === 'high' || a.severity === 'medium')) {
        status = 'warning';
      }

      // توصيات التحسين
      const recommendations: string[] = [];
      
      if (metrics.successRate < 0.95) {
        recommendations.push('فحص أخطاء الإرسال وتحسين موثوقية الخدمات الخارجية');
      }
      
      if (metrics.averageLatency > 3000) {
        recommendations.push('تحسين أداء معالجة الإشعارات وتحسين الاستعلامات');
      }
      
      if (metrics.queueSize > 500) {
        recommendations.push('زيادة سرعة معالجة الطابور أو إضافة معالجات متوازية');
      }

      if (metrics.failureRate > 0.03) {
        recommendations.push('تحليل أسباب الفشل وتحسين آلية إعادة المحاولة');
      }

      return {
        status,
        metrics,
        alerts,
        recommendations
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير محدد';
      await this.logEvent('error', 'health_check', 'فشل في فحص حالة النظام', { error: errorMessage });
      
      return {
        status: 'critical',
        metrics: {} as PerformanceMetrics,
        alerts: [{
          type: 'system_error',
          severity: 'critical',
          message: 'فشل في فحص حالة النظام',
          metadata: { error: errorMessage },
          timestamp: new Date()
        }],
        recommendations: ['إعادة تشغيل خدمة المراقبة', 'فحص اتصال قاعدة البيانات']
      };
    }
  }

  /**
   * تشغيل مراقبة دورية
   */
  startPeriodicMonitoring(intervalMinutes: number = 5): void {
    setInterval(async () => {
      try {
        const health = await this.getSystemHealth();
        
        if (health.status !== 'healthy') {
          await this.logEvent(
            health.status === 'critical' ? 'error' : 'warn',
            'periodic_check',
            `حالة النظام: ${health.status}`,
            { 
              alertsCount: health.alerts.length,
              recommendations: health.recommendations 
            }
          );
        }

        // تنظيف دوري للبيانات القديمة (مرة واحدة يوميًا)
        const now = new Date();
        if (now.getHours() === 2 && now.getMinutes() === 0) {
          await this.cleanupOldData();
        }

      } catch (error) {
        console.error('خطأ في المراقبة الدورية:', error);
      }
    }, intervalMinutes * 60 * 1000);

    console.log(`🔍 تم تفعيل المراقبة الدورية كل ${intervalMinutes} دقائق`);
  }

  /**
   * إنشاء معرف طلب فريد
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * تقرير مفصل للأداء
   */
  async generatePerformanceReport(timeRange: 'day' | 'week' | 'month' = 'day'): Promise<{
    period: string;
    summary: PerformanceMetrics;
    trends: any[];
    topFailures: any[];
    channelPerformance: any[];
  }> {
    const hours = timeRange === 'day' ? 24 : timeRange === 'week' ? 168 : 720;
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    try {
      const metricRange = timeRange === 'month' ? 'week' : timeRange;
      const summary = await this.getPerformanceMetrics(metricRange);

      // أكثر أسباب الفشل شيوعاً
      const topFailures = await db.execute(sql`
        SELECT 
          failure_reason, 
          COUNT(*) as count,
          COUNT(DISTINCT recipient_id) as affected_users
        FROM notification_metrics 
        WHERE created_at >= ${startTime} 
        AND status = 'failed' 
        AND failure_reason IS NOT NULL
        GROUP BY failure_reason 
        ORDER BY count DESC 
        LIMIT 10
      `);

      // أداء القنوات
      const channelPerformance = await db.execute(sql`
        SELECT 
          channel_used,
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful,
          AVG(latency_ms) as avg_latency,
          MIN(latency_ms) as min_latency,
          MAX(latency_ms) as max_latency
        FROM notification_metrics 
        WHERE created_at >= ${startTime}
        GROUP BY channel_used
        ORDER BY total DESC
      `);

      return {
        period: timeRange,
        summary,
        trends: summary.hourlyTrends,
        topFailures: topFailures.rows.map(row => ({
          reason: row.failure_reason,
          count: Number(row.count),
          affectedUsers: Number(row.affected_users)
        })),
        channelPerformance: channelPerformance.rows.map(row => ({
          channel: row.channel_used,
          total: Number(row.total),
          successful: Number(row.successful),
          successRate: Number(row.total) > 0 ? Number(row.successful) / Number(row.total) : 0,
          avgLatency: Number(row.avg_latency) || 0,
          minLatency: Number(row.min_latency) || 0,
          maxLatency: Number(row.max_latency) || 0
        }))
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير محدد';
      await this.logEvent('error', 'report_generation', 'فشل في إنشاء تقرير الأداء', { error: errorMessage });
      throw error;
    }
  }
}

// إنشاء instance عام للخدمة
export const notificationMonitoringService = new NotificationMonitoringService();