import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { deploymentApprovals, deploymentPermissions } from "../../shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { type AuthenticatedRequest } from "./auth";

export async function checkDeployPermission(req: Request, res: Response, next: NextFunction) {
  const user = (req as AuthenticatedRequest).user;
  if (!user) {
    return res.status(401).json({ success: false, message: "Authentication required", code: "UNAUTHORIZED" });
  }

  if (user.role === "super_admin" || user.role === "admin") {
    return next();
  }

  const pipeline = req.body.pipeline || "web-deploy";
  const environment = req.body.environment || "production";

  try {
    const permissions = await db
      .select()
      .from(deploymentPermissions)
      .where(eq(deploymentPermissions.userId, user.user_id))
      .limit(1);

    if (permissions.length === 0) {
      return res.status(403).json({
        success: false,
        message: "No deployment permissions configured for this user",
        code: "NO_DEPLOY_PERMISSION",
      });
    }

    const perm = permissions[0];

    if (!perm.allowedPipelines.includes(pipeline)) {
      return res.status(403).json({
        success: false,
        message: `User not authorized for pipeline: ${pipeline}`,
        code: "PIPELINE_NOT_ALLOWED",
      });
    }

    if (!perm.allowedEnvironments.includes(environment)) {
      return res.status(403).json({
        success: false,
        message: `User not authorized for environment: ${environment}`,
        code: "ENVIRONMENT_NOT_ALLOWED",
      });
    }

    const limitExceeded = await checkDailyLimit(user.user_id, perm.maxDailyDeploys);
    if (limitExceeded) {
      return res.status(429).json({
        success: false,
        message: `Daily deployment limit reached (${perm.maxDailyDeploys})`,
        code: "DAILY_LIMIT_EXCEEDED",
      });
    }

    (req as any).deploymentPermission = perm;
    next();
  } catch (error) {
    console.error("[deployment-auth] Error checking permissions:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking deployment permissions",
      code: "PERMISSION_CHECK_ERROR",
    });
  }
}

export async function requireApproval(req: Request, res: Response, next: NextFunction) {
  const user = (req as AuthenticatedRequest).user;
  if (!user) {
    return res.status(401).json({ success: false, message: "Authentication required", code: "UNAUTHORIZED" });
  }

  if (user.role === "super_admin") {
    return next();
  }

  const environment = req.body.environment || "production";
  const pipeline = req.body.pipeline || "web-deploy";

  if (environment !== "production") {
    return next();
  }

  const perm = (req as any).deploymentPermission;
  if (perm && !perm.requiresApproval) {
    return next();
  }

  try {
    const deploymentId = `pending-${Date.now()}`;

    await db.insert(deploymentApprovals).values({
      deploymentId,
      requestedBy: user.user_id,
      status: "pending",
      pipeline,
      environment,
    });

    return res.status(202).json({
      success: true,
      message: "Deployment requires approval for production environment",
      code: "APPROVAL_REQUIRED",
      approvalId: deploymentId,
    });
  } catch (error) {
    console.error("[deployment-auth] Error creating approval request:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating approval request",
      code: "APPROVAL_CREATE_ERROR",
    });
  }
}

export async function checkDailyLimit(userId: string, maxDaily: number): Promise<boolean> {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(deploymentApprovals)
      .where(
        and(
          eq(deploymentApprovals.requestedBy, userId),
          gte(deploymentApprovals.createdAt, todayStart)
        )
      );

    const count = result[0]?.count ?? 0;
    return count >= maxDaily;
  } catch (error) {
    console.error("[deployment-auth] Error checking daily limit:", error);
    return true;
  }
}
