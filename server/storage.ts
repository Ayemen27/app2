import type { 
  ErrorLog, 
  InsertErrorLog,
  BuildLog,
  InsertBuildLog,
  SystemMetric,
  InsertSystemMetric,
  Recommendation,
  InsertRecommendation,
  SystemStatus,
  InsertSystemStatus
} from "@shared/schema";

export interface IStorage {
  // Error Logs operations
  getErrorLogs(filters?: { type?: string; status?: string; limit?: number }): Promise<ErrorLog[]>;
  createErrorLog(data: InsertErrorLog): Promise<ErrorLog>;
  updateErrorLog(id: number, data: Partial<ErrorLog>): Promise<ErrorLog>;
  resolveErrorLog(id: number, resolution: string, resolvedBy: string): Promise<ErrorLog>;
  
  // Build Logs operations  
  getBuildLogs(limit?: number): Promise<BuildLog[]>;
  createBuildLog(data: InsertBuildLog): Promise<BuildLog>;
  updateBuildLog(id: number, data: Partial<BuildLog>): Promise<BuildLog>;
  getLatestBuild(): Promise<BuildLog | null>;
  
  // System Metrics operations
  getSystemMetrics(type?: string, limit?: number): Promise<SystemMetric[]>;
  createSystemMetric(data: InsertSystemMetric): Promise<SystemMetric>;
  getBuildSuccessRate(days?: number): Promise<number>;
  getAverageBuildTime(days?: number): Promise<number>;
  
  // Recommendations operations
  getRecommendations(status?: string): Promise<Recommendation[]>;
  createRecommendation(data: InsertRecommendation): Promise<Recommendation>;
  updateRecommendation(id: number, data: Partial<Recommendation>): Promise<Recommendation>;
  applyRecommendation(id: number, appliedBy: string): Promise<Recommendation>;
  
  // System Status operations
  getSystemStatus(): Promise<SystemStatus[]>;
  updateSystemStatus(service: string, data: Partial<SystemStatus>): Promise<SystemStatus>;
  
  // Analytics and Dashboard data
  getDashboardData(): Promise<{
    errorSummary: { critical: number; warnings: number; info: number };
    buildMetrics: { successRate: number; avgBuildTime: number; appSize: number };
    systemHealth: { services: SystemStatus[] };
    recentErrors: ErrorLog[];
    activeRecommendations: Recommendation[];
  }>;
}

// In-Memory Implementation for development
class MemStorage implements IStorage {
  private errorLogs: ErrorLog[] = [];
  private buildLogs: BuildLog[] = [];
  private systemMetrics: SystemMetric[] = [];
  private recommendations: Recommendation[] = [];
  private systemStatus: SystemStatus[] = [];
  private idCounters = {
    errorLogs: 1,
    buildLogs: 1,
    systemMetrics: 1,
    recommendations: 1,
    systemStatus: 1,
  };

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    // Initialize with critical 502 error from Netlify
    this.errorLogs.push({
      id: this.idCounters.errorLogs++,
      errorType: "critical",
      errorCode: "502",
      title: "خطأ حرج: فشل في البناء - 502 Error",
      description: "تم اكتشاف خطأ في عملية البناء على Netlify. السبب الرئيسي: عدم وجود vite في بيئة الإنتاج",
      stackTrace: "ERROR: sh: 1: vite: not found\nBUILD: Command failed with exit code 127",
      source: "netlify",
      status: "active",
      severity: 5,
      metadata: {
        buildId: "build_001",
        environment: "production",
        nodeEnv: "production"
      },
      occurredAt: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
      resolvedAt: null,
      resolvedBy: null,
      resolution: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 15)
    });

    // Initialize build logs
    this.buildLogs.push({
      id: this.idCounters.buildLogs++,
      buildId: "build_001",
      status: "failed",
      startTime: new Date(Date.now() - 1000 * 60 * 16),
      endTime: new Date(Date.now() - 1000 * 60 * 15),
      duration: 33,
      buildSize: 610.9,
      logContent: `12:46:33 AM: $ npm run build
12:46:33 AM: > rest-express@1.0.0 build  
12:46:33 AM: > vite build && esbuild server/index.ts...
12:46:33 AM: sh: 1: vite: not found
12:46:33 AM: Command failed with exit code 127`,
      errorDetails: {
        command: "vite build",
        exitCode: 127,
        error: "sh: 1: vite: not found"
      },
      environment: "production",
      branch: "main",
      commitHash: "abc123def456",
      deployUrl: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 15)
    });

    // Initialize system status
    const services = [
      { service: "netlify_build", status: "down", responseTime: null, uptime: 67 },
      { service: "frontend", status: "degraded", responseTime: 2500, uptime: 78 },
      { service: "api_functions", status: "operational", responseTime: 150, uptime: 99.9 },
      { service: "database", status: "operational", responseTime: 45, uptime: 100 }
    ];

    services.forEach(({ service, status, responseTime, uptime }) => {
      this.systemStatus.push({
        id: this.idCounters.systemStatus++,
        service,
        status,
        lastChecked: new Date(),
        responseTime,
        uptime,
        metadata: {}
      });
    });

    // Initialize recommendations
    this.recommendations.push({
      id: this.idCounters.recommendations++,
      errorLogId: 1,
      title: "إصلاح package.json",
      description: "نقل vite من devDependencies إلى dependencies لضمان توفره في بيئة الإنتاج",
      actionType: "auto_fix",
      priority: 1,
      status: "pending",
      autoFixScript: `{
        "script": "move-vite-to-dependencies",
        "changes": {
          "from": "devDependencies",
          "to": "dependencies",
          "package": "vite"
        }
      }`,
      manualSteps: [
        "افتح ملف package.json",
        "انقل 'vite' من 'devDependencies' إلى 'dependencies'",
        "قم بحفظ الملف",
        "ادفع التغييرات إلى المستودع"
      ],
      estimatedTime: 5,
      appliedAt: null,
      appliedBy: null,
      result: null,
      createdAt: new Date()
    });
  }

  async getErrorLogs(filters?: { type?: string; status?: string; limit?: number }): Promise<ErrorLog[]> {
    let filtered = [...this.errorLogs];
    
    if (filters?.type) {
      filtered = filtered.filter(log => log.errorType === filters.type);
    }
    if (filters?.status) {
      filtered = filtered.filter(log => log.status === filters.status);
    }
    if (filters?.limit) {
      filtered = filtered.slice(0, filters.limit);
    }
    
    return filtered.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  }

  async createErrorLog(data: InsertErrorLog): Promise<ErrorLog> {
    const errorLog: ErrorLog = {
      id: this.idCounters.errorLogs++,
      ...data,
      occurredAt: data.occurredAt || new Date(),
      createdAt: new Date()
    };
    this.errorLogs.push(errorLog);
    return errorLog;
  }

  async updateErrorLog(id: number, data: Partial<ErrorLog>): Promise<ErrorLog> {
    const index = this.errorLogs.findIndex(log => log.id === id);
    if (index === -1) throw new Error("Error log not found");
    
    this.errorLogs[index] = { ...this.errorLogs[index], ...data };
    return this.errorLogs[index];
  }

  async resolveErrorLog(id: number, resolution: string, resolvedBy: string): Promise<ErrorLog> {
    return this.updateErrorLog(id, {
      status: "resolved",
      resolution,
      resolvedBy,
      resolvedAt: new Date()
    });
  }

  async getBuildLogs(limit = 10): Promise<BuildLog[]> {
    return [...this.buildLogs]
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  async createBuildLog(data: InsertBuildLog): Promise<BuildLog> {
    const buildLog: BuildLog = {
      id: this.idCounters.buildLogs++,
      ...data,
      createdAt: new Date()
    };
    this.buildLogs.push(buildLog);
    return buildLog;
  }

  async updateBuildLog(id: number, data: Partial<BuildLog>): Promise<BuildLog> {
    const index = this.buildLogs.findIndex(log => log.id === id);
    if (index === -1) throw new Error("Build log not found");
    
    this.buildLogs[index] = { ...this.buildLogs[index], ...data };
    return this.buildLogs[index];
  }

  async getLatestBuild(): Promise<BuildLog | null> {
    if (this.buildLogs.length === 0) return null;
    return [...this.buildLogs].sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0];
  }

  async getSystemMetrics(type?: string, limit = 50): Promise<SystemMetric[]> {
    let filtered = [...this.systemMetrics];
    
    if (type) {
      filtered = filtered.filter(metric => metric.metricType === type);
    }
    
    return filtered
      .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
      .slice(0, limit);
  }

  async createSystemMetric(data: InsertSystemMetric): Promise<SystemMetric> {
    const metric: SystemMetric = {
      id: this.idCounters.systemMetrics++,
      ...data,
      recordedAt: new Date()
    };
    this.systemMetrics.push(metric);
    return metric;
  }

  async getBuildSuccessRate(days = 7): Promise<number> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentBuilds = this.buildLogs.filter(build => build.startTime >= since);
    
    if (recentBuilds.length === 0) return 0;
    
    const successfulBuilds = recentBuilds.filter(build => build.status === "success").length;
    return (successfulBuilds / recentBuilds.length) * 100;
  }

  async getAverageBuildTime(days = 7): Promise<number> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentBuilds = this.buildLogs.filter(build => 
      build.startTime >= since && build.duration !== null
    );
    
    if (recentBuilds.length === 0) return 0;
    
    const totalDuration = recentBuilds.reduce((sum, build) => sum + (build.duration || 0), 0);
    return totalDuration / recentBuilds.length;
  }

  async getRecommendations(status?: string): Promise<Recommendation[]> {
    let filtered = [...this.recommendations];
    
    if (status) {
      filtered = filtered.filter(rec => rec.status === status);
    }
    
    return filtered.sort((a, b) => a.priority - b.priority);
  }

  async createRecommendation(data: InsertRecommendation): Promise<Recommendation> {
    const recommendation: Recommendation = {
      id: this.idCounters.recommendations++,
      ...data,
      createdAt: new Date()
    };
    this.recommendations.push(recommendation);
    return recommendation;
  }

  async updateRecommendation(id: number, data: Partial<Recommendation>): Promise<Recommendation> {
    const index = this.recommendations.findIndex(rec => rec.id === id);
    if (index === -1) throw new Error("Recommendation not found");
    
    this.recommendations[index] = { ...this.recommendations[index], ...data };
    return this.recommendations[index];
  }

  async applyRecommendation(id: number, appliedBy: string): Promise<Recommendation> {
    return this.updateRecommendation(id, {
      status: "applied",
      appliedBy,
      appliedAt: new Date(),
      result: "تم تطبيق الإصلاح بنجاح"
    });
  }

  async getSystemStatus(): Promise<SystemStatus[]> {
    return [...this.systemStatus];
  }

  async updateSystemStatus(service: string, data: Partial<SystemStatus>): Promise<SystemStatus> {
    const index = this.systemStatus.findIndex(status => status.service === service);
    if (index === -1) throw new Error("System status not found");
    
    this.systemStatus[index] = { ...this.systemStatus[index], ...data, lastChecked: new Date() };
    return this.systemStatus[index];
  }

  async getDashboardData() {
    const errorLogs = await this.getErrorLogs({ limit: 100 });
    const recommendations = await this.getRecommendations("pending");
    const systemStatus = await this.getSystemStatus();
    const buildSuccessRate = await this.getBuildSuccessRate();
    const avgBuildTime = await this.getAverageBuildTime();
    const latestBuild = await this.getLatestBuild();

    return {
      errorSummary: {
        critical: errorLogs.filter(e => e.errorType === "critical" && e.status === "active").length,
        warnings: errorLogs.filter(e => e.errorType === "warning" && e.status === "active").length,
        info: errorLogs.filter(e => e.errorType === "info" && e.status === "active").length
      },
      buildMetrics: {
        successRate: buildSuccessRate,
        avgBuildTime: avgBuildTime,
        appSize: latestBuild?.buildSize || 0
      },
      systemHealth: {
        services: systemStatus
      },
      recentErrors: errorLogs.slice(0, 5),
      activeRecommendations: recommendations.slice(0, 5)
    };
  }
}

const storage = new MemStorage();
export default storage;
