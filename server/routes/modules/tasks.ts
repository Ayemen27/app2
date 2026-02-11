import { Router } from "express";
import { storage } from "../../storage";
import { insertTaskSchema } from "@shared/schema";

const router = Router();

router.get("/", async (_req, res) => {
  const tasks = await storage.getTasks();
  res.json(tasks);
});

router.post("/", async (req, res) => {
  const parsed = insertTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }
  const task = await storage.createTask(parsed.data);
  res.status(201).json(task);
});

router.patch("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const task = await storage.updateTask(id, req.body);
  if (!task) return res.status(404).send("Task not found");
  res.json(task);
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await storage.deleteTask(id);
  res.sendStatus(204);
});

export default router;
