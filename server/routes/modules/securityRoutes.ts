import { Router, Request, Response } from "express";
import { db } from "../../db";
import { securityPolicies, securityPolicySuggestions, securityPolicyViolations } from "../../../shared/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from '../../middleware/auth';

const router = Router();
router.use(requireAuth);
router.use(requireAdmin);

router.get("/policies", async (req: Request, res: Response) => {
  try {
    const policies = await db.select().from(securityPolicies).orderBy(desc(securityPolicies.created_at));
    res.json({ success: true, data: policies });
  } catch (error) {
    res.json({ success: true, data: [] });
  }
});

router.get("/suggestions", async (req: Request, res: Response) => {
  try {
    const suggestions = await db.select().from(securityPolicySuggestions).orderBy(desc(securityPolicySuggestions.created_at));
    res.json({ success: true, data: suggestions });
  } catch (error) {
    res.json({ success: true, data: [] });
  }
});

router.get("/violations", async (req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        violation: securityPolicyViolations,
        policy: {
          id: securityPolicies.id,
          title: securityPolicies.title,
          category: securityPolicies.category,
        },
      })
      .from(securityPolicyViolations)
      .leftJoin(securityPolicies, eq(securityPolicyViolations.policyId, securityPolicies.id))
      .orderBy(desc(securityPolicyViolations.created_at));
    res.json({ success: true, data: rows });
  } catch (error) {
    res.json({ success: true, data: [] });
  }
});

export default router;
