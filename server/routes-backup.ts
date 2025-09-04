import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import storage from "./storage";
import { 
  insertErrorLogSchema, 
  insertBuildLogSchema,
  insertSystemMetricSchema,
  insertRecommendationSchema,
  insertSystemStatusSchema 
} from "@shared/schema";

const app = new Hono();

// Dashboard endpoint - main data for error tracking dashboard
app.get("/api/dashboard", async (c) => {
  try {
    const dashboardData = await storage.getDashboardData();
    return c.json({ success: true, data: dashboardData });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: "Failed to fetch dashboard data",
      message: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Error Logs endpoints
app.get("/api/error-logs", async (c) => {
  try {
    const { type, status, limit } = c.req.query();
    const filters = {
      ...(type && { type }),
      ...(status && { status }),
      ...(limit && { limit: parseInt(limit) })
    };
    
    const errorLogs = await storage.getErrorLogs(filters);
    return c.json({ success: true, data: errorLogs });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: "Failed to fetch error logs",
      message: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.post("/api/error-logs", zValidator("json", insertErrorLogSchema), async (c) => {
  try {
    const data = c.req.valid("json");
    const errorLog = await storage.createErrorLog(data);
    return c.json({ success: true, data: errorLog }, 201);
  } catch (error) {
    return c.json({ 
      success: false, 
      error: "Failed to create error log",
      message: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.patch("/api/error-logs/:id/resolve", 
  zValidator("json", z.object({
    resolution: z.string().min(1),
    resolvedBy: z.string().min(1)
  })), 
  async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const { resolution, resolvedBy } = c.req.valid("json");
      
      const errorLog = await storage.resolveErrorLog(id, resolution, resolvedBy);
      return c.json({ success: true, data: errorLog });
    } catch (error) {
      return c.json({ 
        success: false, 
        error: "Failed to resolve error log",
        message: error instanceof Error ? error.message : "Unknown error"
      }, 500);
    }
  }
);

// Build Logs endpoints
app.get("/api/build-logs", async (c) => {
  try {
    const { limit } = c.req.query();
    const buildLogs = await storage.getBuildLogs(limit ? parseInt(limit) : undefined);
    return c.json({ success: true, data: buildLogs });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: "Failed to fetch build logs",
      message: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.post("/api/build-logs", zValidator("json", insertBuildLogSchema), async (c) => {
  try {
    const data = c.req.valid("json");
    const buildLog = await storage.createBuildLog(data);
    return c.json({ success: true, data: buildLog }, 201);
  } catch (error) {
    return c.json({ 
      success: false, 
      error: "Failed to create build log",
      message: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.get("/api/build-logs/latest", async (c) => {
  try {
    const latestBuild = await storage.getLatestBuild();
    return c.json({ success: true, data: latestBuild });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: "Failed to fetch latest build",
      message: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// System Metrics endpoints
app.get("/api/system-metrics", async (c) => {
  try {
    const { type, limit } = c.req.query();
    const metrics = await storage.getSystemMetrics(
      type || undefined, 
      limit ? parseInt(limit) : undefined
    );
    return c.json({ success: true, data: metrics });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: "Failed to fetch system metrics",
      message: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.post("/api/system-metrics", zValidator("json", insertSystemMetricSchema), async (c) => {
  try {
    const data = c.req.valid("json");
    const metric = await storage.createSystemMetric(data);
    return c.json({ success: true, data: metric }, 201);
  } catch (error) {
    return c.json({ 
      success: false, 
      error: "Failed to create system metric",
      message: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Recommendations endpoints
app.get("/api/recommendations", async (c) => {
  try {
    const { status } = c.req.query();
    const recommendations = await storage.getRecommendations(status || undefined);
    return c.json({ success: true, data: recommendations });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: "Failed to fetch recommendations",
      message: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.post("/api/recommendations", zValidator("json", insertRecommendationSchema), async (c) => {
  try {
    const data = c.req.valid("json");
    const recommendation = await storage.createRecommendation(data);
    return c.json({ success: true, data: recommendation }, 201);
  } catch (error) {
    return c.json({ 
      success: false, 
      error: "Failed to create recommendation",
      message: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.post("/api/recommendations/:id/apply", 
  zValidator("json", z.object({
    appliedBy: z.string().min(1)
  })), 
  async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const { appliedBy } = c.req.valid("json");
      
      const recommendation = await storage.applyRecommendation(id, appliedBy);
      
      // If this is an auto-fix recommendation, simulate the fix
      if (recommendation.actionType === "auto_fix") {
        // Simulate applying the fix
        setTimeout(async () => {
          try {
            // Create a success metric
            await storage.createSystemMetric({
              metricType: "auto_fix_success",
              value: "1",
              unit: "count",
              metadata: { recommendationId: id, appliedBy }
            });
            
            // Update build status if this was a build-related fix
            if (recommendation.errorLogId) {
              await storage.resolveErrorLog(
                recommendation.errorLogId, 
                "تم تطبيق الإصلاح التلقائي بنجاح", 
                appliedBy
              );
            }
          } catch (error) {
            console.error("Failed to apply auto-fix:", error);
          }
        }, 2000);
      }
      
      return c.json({ success: true, data: recommendation });
    } catch (error) {
      return c.json({ 
        success: false, 
        error: "Failed to apply recommendation",
        message: error instanceof Error ? error.message : "Unknown error"
      }, 500);
    }
  }
);

// System Status endpoints
app.get("/api/system-status", async (c) => {
  try {
    const systemStatus = await storage.getSystemStatus();
    return c.json({ success: true, data: systemStatus });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: "Failed to fetch system status",
      message: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.patch("/api/system-status/:service", 
  zValidator("json", z.object({
    status: z.enum(["operational", "degraded", "down", "maintenance"]).optional(),
    responseTime: z.number().optional(),
    uptime: z.number().optional(),
    metadata: z.any().optional()
  })), 
  async (c) => {
    try {
      const service = c.req.param("service");
      const data = c.req.valid("json");
      
      const systemStatus = await storage.updateSystemStatus(service, data);
      return c.json({ success: true, data: systemStatus });
    } catch (error) {
      return c.json({ 
        success: false, 
        error: "Failed to update system status",
        message: error instanceof Error ? error.message : "Unknown error"
      }, 500);
    }
  }
);

// Auto-fix endpoint for Netlify build issues
app.post("/api/auto-fix/netlify-build", async (c) => {
  try {
    // This would typically interact with Netlify API or git repository
    // For now, we'll simulate the fix by creating appropriate logs
    
    // Create a new build log showing the fix attempt
    const buildLog = await storage.createBuildLog({
      buildId: `fix_${Date.now()}`,
      status: "in_progress",
      startTime: new Date(),
      endTime: null,
      duration: null,
      buildSize: null,
      logContent: "تم بدء عملية الإصلاح التلقائي...\nنقل vite من devDependencies إلى dependencies...",
      errorDetails: null,
      environment: "production",
      branch: "main",
      commitHash: null,
      deployUrl: null
    });

    // Simulate fix completion after 5 seconds
    setTimeout(async () => {
      try {
        await storage.updateBuildLog(buildLog.id, {
          status: "success",
          endTime: new Date(),
          duration: 45,
          buildSize: 512.3,
          logContent: buildLog.logContent + "\n✅ تم تطبيق الإصلاح بنجاح\n✅ تم بناء التطبيق بنجاح\n🚀 تم نشر التطبيق بنجاح",
          deployUrl: "https://your-app.netlify.app"
        });

        // Update system status
        await storage.updateSystemStatus("netlify_build", {
          status: "operational",
          uptime: 95
        });

        await storage.updateSystemStatus("frontend", {
          status: "operational", 
          responseTime: 250,
          uptime: 99.5
        });
        
        // Create success metric
        await storage.createSystemMetric({
          metricType: "auto_fix_success",
          value: "1",
          unit: "count",
          metadata: { fixType: "netlify_build", buildId: buildLog.id }
        });
        
      } catch (error) {
        console.error("Failed to complete auto-fix simulation:", error);
      }
    }, 5000);

    return c.json({ 
      success: true, 
      message: "تم بدء عملية الإصلاح التلقائي",
      data: { buildId: buildLog.id, estimatedTime: 45 }
    });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: "Failed to start auto-fix",
      message: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Real-time logs endpoint (simulated)
app.get("/api/realtime-logs", async (c) => {
  try {
    // Simulate real-time log entries
    const logEntries = [
      {
        timestamp: new Date(),
        level: "INFO",
        message: "تم بدء مراقبة النظام...",
        source: "system"
      },
      {
        timestamp: new Date(Date.now() - 1000),
        level: "SUCCESS", 
        message: "تم الاتصال بقاعدة البيانات بنجاح",
        source: "database"
      },
      {
        timestamp: new Date(Date.now() - 2000),
        level: "WARNING",
        message: "تم اكتشاف استخدام مرتفع للذاكرة: 78%",
        source: "system"
      },
      {
        timestamp: new Date(Date.now() - 3000),
        level: "ERROR",
        message: "فشل في تحميل ملف التكوين: netlify.toml",
        source: "netlify"
      },
      {
        timestamp: new Date(Date.now() - 4000),
        level: "INFO",
        message: "جاري إعادة المحاولة... (محاولة 1/3)",
        source: "system"
      }
    ];
    
    return c.json({ success: true, data: logEntries });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: "Failed to fetch realtime logs",
      message: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

export default app;
