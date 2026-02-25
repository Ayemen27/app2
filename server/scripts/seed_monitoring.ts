import { db } from "../db";
import { monitoringData, systemLogs, crashes } from "../../shared/schema";

async function seed() {
  console.log("🌱 Seeding monitoring data...");
  
  // Seed some logs
  await db.insert(systemLogs).values([
    {
      level: "info",
      message: "System initialized and monitoring active",
      source: "server",
      category: "system"
    },
    {
      level: "warn",
      message: "Slow database connection detected (VPS)",
      source: "db-manager",
      category: "database"
    }
  ]);

  // Seed monitoring metrics
  await db.insert(monitoringData).values([
    {
      type: "cpu",
      value: "25",
      unit: "%",
      status: "normal"
    },
    {
      type: "memory",
      value: "85",
      unit: "%",
      status: "normal"
    }
  ]);

  console.log("✅ Seed complete");
}

seed().catch(console.error);
