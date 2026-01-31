import { db } from "../../db.js";
import { buildDeployments } from "@shared/schema";
import { desc } from "drizzle-orm";
import type { Request, Response } from "express";

/**
 * 🛠️ نظام إدارة إصدارات التطبيق (المعايير العالمية)
 */
export async function getSystemVersion(req: Request, res: Response) {
  try {
    const latestBuild = await db.select()
      .from(buildDeployments)
      .orderBy(desc(buildDeployments.startTime))
      .limit(1);

    const version = latestBuild.length > 0 ? latestBuild[0].version : "2.1.0";

    return res.json({
      success: true,
      version,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return res.json({
      success: true,
      version: "2.1.0",
      timestamp: new Date().toISOString()
    });
  }
}
