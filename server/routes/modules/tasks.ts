import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { insertTaskSchema } from "@shared/schema";
import { requireAuth, requireAdmin } from '../../middleware/auth';

const router = Router();
router.use(requireAuth);
router.use(requireAdmin);

const taskPatchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  completed: z.boolean().optional(),
}).strict();

router.get("/", async (_req, res) => {
  const tasks = await storage.getTasks();
  res.json(tasks);
});

router.post("/", async (req: Request, res: Response) => {
  const parsed = insertTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }
  const task = await storage.createTask(parsed.data);
  res.status(201).json(task);
});

router.patch("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const parsed = taskPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error });
  }
  if (Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ success: false, message: 'No valid fields to update' });
  }
  const task = await storage.updateTask(id, parsed.data);
  if (!task) return res.status(404).send("Task not found");
  res.json(task);
});

router.delete("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  await storage.deleteTask(id);
  res.sendStatus(204);
});

export default router;
