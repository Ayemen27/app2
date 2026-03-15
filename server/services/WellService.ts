import { db } from '../db';
import { eq, and, sql, desc, asc, isNull, inArray } from 'drizzle-orm';
import {
  wells, wellTasks, wellTaskAccounts, wellExpenses, wellAuditLogs,
  projects, users, workerAttendance, materialPurchases, transportationExpenses,
  wellWorkCrews, wellSolarComponents, wellTransportDetails, wellReceptions
} from '../../shared/schema';

export interface CreateWellDTO {
  project_id: string;
  wellNumber: number;
  ownerName: string;
  region: string;
  numberOfBases: number;
  numberOfPanels: number;
  wellDepth: number;
  waterLevel?: number;
  numberOfPipes: number;
  fanType?: string;
  pumpPower?: number;
  startDate?: string;
  notes?: string;
  createdBy: string;
}

export interface UpdateWellDTO {
  ownerName?: string;
  region?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  completionPercentage?: number;
  completionDate?: string;
  notes?: string;
}

export interface CreateTaskDTO {
  taskType: string;
  description: string;
  taskOrder?: number;
  assignedWorkerId?: string;
  estimatedCost?: number;
}

export interface AccountTaskDTO {
  amount: number;
  paymentMethod?: string;
  description?: string;
}

export class WellService {
  static async getAllWells(project_id?: string, filters?: any) {
    try {
      let query = db.select().from(wells);

      if (project_id) {
        query = query.where(eq(wells.project_id, project_id)) as typeof query;
      }

      const wellsList = await query.orderBy(wells.wellNumber);

      const wellIds = wellsList.map(w => w.id);
      if (wellIds.length === 0) return wellsList;

      const [crewCounts, transportCounts, solarStatuses, receptionStatuses] = await Promise.all([
        db.select({
          well_id: wellWorkCrews.well_id,
          count: sql<number>`count(*)::int`,
        }).from(wellWorkCrews)
          .where(inArray(wellWorkCrews.well_id, wellIds))
          .groupBy(wellWorkCrews.well_id),

        db.select({
          well_id: wellTransportDetails.well_id,
          count: sql<number>`count(*)::int`,
        }).from(wellTransportDetails)
          .where(inArray(wellTransportDetails.well_id, wellIds))
          .groupBy(wellTransportDetails.well_id),

        db.select({
          well_id: wellSolarComponents.well_id,
          id: wellSolarComponents.id,
          extraPipes: wellSolarComponents.extraPipes,
        }).from(wellSolarComponents)
          .where(inArray(wellSolarComponents.well_id, wellIds)),

        db.execute(sql`
          SELECT DISTINCT ON (well_id) well_id, inspection_status AS "inspectionStatus"
          FROM well_receptions
          WHERE well_id = ANY(${wellIds}::int[])
          ORDER BY well_id, id DESC
        `),
      ]);

      const crewMap = new Map(crewCounts.map(c => [c.well_id, c.count]));
      const transportMap = new Map(transportCounts.map(t => [t.well_id, t.count]));
      const solarSet = new Set(solarStatuses.map(s => s.well_id));
      const solarExtraPipesMap = new Map(solarStatuses.map(s => [s.well_id, Number(s.extraPipes) || 0]));
      const receptionMap = new Map<number, string>();
      const receptionRows = (receptionStatuses as any).rows || receptionStatuses;
      for (const r of receptionRows) {
        receptionMap.set(r.well_id, r.inspectionStatus || 'pending');
      }

      return wellsList.map(well => ({
        ...well,
        crewCount: crewMap.get(well.id) || 0,
        transportCount: transportMap.get(well.id) || 0,
        hasSolar: solarSet.has(well.id),
        extraPipes: solarExtraPipesMap.get(well.id) || 0,
        receptionStatus: receptionMap.get(well.id) || null,
      }));
    } catch (error) {
      console.error('[WellService] Error fetching wells:', error);
      throw error;
    }
  }

  static async getWellById(well_id: number) {
    try {
      const well = await db.select()
        .from(wells)
        .where(eq(wells.id, well_id))
        .limit(1);

      if (!well.length) {
        throw new Error('Well not found');
      }

      return well[0];
    } catch (error) {
      console.error('[WellService] Error fetching well:', error);
      throw error;
    }
  }

  static async createWell(data: CreateWellDTO) {
    try {
      const newWell = await db.insert(wells).values({
        project_id: data.project_id,
        wellNumber: data.wellNumber,
        ownerName: data.ownerName,
        region: data.region,
        numberOfBases: data.numberOfBases,
        numberOfPanels: data.numberOfPanels,
        wellDepth: data.wellDepth,
        waterLevel: data.waterLevel || null,
        numberOfPipes: data.numberOfPipes,
        fanType: data.fanType || null,
        pumpPower: data.pumpPower || null,
        status: 'pending',
        completionPercentage: '0',
        startDate: data.startDate || null,
        createdBy: data.createdBy,
      }).returning();

      return newWell[0];
    } catch (error) {
      console.error('[WellService] Error creating well:', error);
      throw error;
    }
  }

  static async updateWell(well_id: number, data: UpdateWellDTO) {
    try {
      const updateData: any = {};
      
      if (data.ownerName !== undefined) updateData.ownerName = data.ownerName;
      if (data.region !== undefined) updateData.region = data.region;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.completionPercentage !== undefined) updateData.completionPercentage = String(data.completionPercentage);
      if (data.completionDate !== undefined) updateData.completionDate = data.completionDate || null;
      if (data.notes !== undefined) updateData.notes = data.notes;
      
      updateData.updated_at = new Date();
      
      const updated = await db.update(wells)
        .set(updateData)
        .where(eq(wells.id, well_id))
        .returning();

      return updated[0];
    } catch (error) {
      console.error('[WellService] Error updating well:', error);
      throw error;
    }
  }

  static async deleteWell(well_id: number) {
    try {
      await db.delete(wells).where(eq(wells.id, well_id));
    } catch (error) {
      console.error('[WellService] Error deleting well:', error);
      throw error;
    }
  }

  static async getTaskById(taskId: number) {
    try {
      const task = await db.select()
        .from(wellTasks)
        .where(eq(wellTasks.id, taskId))
        .limit(1);

      return task.length ? task[0] : null;
    } catch (error) {
      console.error('[WellService] Error fetching task by id:', error);
      return null;
    }
  }

  static async getWellTasks(well_id: number) {
    try {
      const tasks = await db.select({
        task: wellTasks,
        account: wellTaskAccounts,
      })
        .from(wellTasks)
        .leftJoin(wellTaskAccounts, eq(wellTasks.id, wellTaskAccounts.taskId))
        .where(eq(wellTasks.well_id, well_id))
        .orderBy(wellTasks.taskOrder);

      return tasks.map(row => ({
        ...row.task,
        isAccounted: row.account !== null,
        accountDetails: row.account,
      }));
    } catch (error) {
      console.error('[WellService] Error fetching well tasks:', error);
      throw error;
    }
  }

  static async createTask(well_id: number, data: CreateTaskDTO, user_id: string) {
    try {
      let taskOrder = data.taskOrder;
      if (taskOrder === undefined) {
        const existing = await db.select({ cnt: sql<number>`count(*)` })
          .from(wellTasks)
          .where(eq(wellTasks.well_id, well_id));
        taskOrder = (Number(existing[0]?.cnt) || 0) + 1;
      }

      const newTask = await db.insert(wellTasks).values({
        well_id,
        taskType: data.taskType,
        description: data.description || null,
        taskOrder,
        assignedWorkerId: data.assignedWorkerId || null,
        status: 'pending',
        estimatedCost: data.estimatedCost ? String(data.estimatedCost) : null,
        createdBy: user_id,
      }).returning();

      await db.insert(wellAuditLogs).values({
        well_id,
        taskId: newTask[0].id,
        action: 'create',
        entityType: 'task',
        entityId: newTask[0].id,
        newData: data,
        user_id,
      });

      return newTask[0];
    } catch (error) {
      console.error('[WellService] Error creating task:', error);
      throw error;
    }
  }

  static async updateTaskStatus(taskId: number, status: string, user_id: string) {
    try {
      const existing = await this.getTaskById(taskId);
      const previousStatus = existing?.status || 'unknown';

      const updated = await db.update(wellTasks)
        .set({
          status,
          updated_at: new Date()
        })
        .where(eq(wellTasks.id, taskId))
        .returning();

      if (updated.length > 0) {
        await db.insert(wellAuditLogs).values({
          well_id: updated[0].well_id,
          taskId,
          action: 'status_change',
          entityType: 'task',
          entityId: taskId,
          previousData: { status: previousStatus },
          newData: { status },
          user_id,
        });
      }

      return updated[0];
    } catch (error) {
      console.error('[WellService] Error updating task status:', error);
      throw error;
    }
  }

  static async accountTask(taskId: number, data: AccountTaskDTO, accountedByUserId: string) {
    try {
      const task = await db.select()
        .from(wellTasks)
        .where(eq(wellTasks.id, taskId))
        .limit(1);

      if (!task.length) {
        throw new Error('Task not found');
      }

      const taskData = task[0];

      if (taskData.status !== 'completed') {
        throw new Error('Cannot account for an incomplete task');
      }

      const existingAccount = await db.select()
        .from(wellTaskAccounts)
        .where(eq(wellTaskAccounts.taskId, taskId))
        .limit(1);

      if (existingAccount.length > 0) {
        throw new Error('Task already accounted');
      }

      const account = await db.insert(wellTaskAccounts).values({
        taskId,
        amount: String(data.amount),
        paymentMethod: data.paymentMethod || null,
        accountedBy: accountedByUserId,
        notes: data.description || null,
      }).returning();

      await db.insert(wellAuditLogs).values({
        well_id: taskData.well_id,
        taskId,
        action: 'account',
        entityType: 'account',
        entityId: account[0].id,
        newData: data,
        user_id: accountedByUserId,
      });

      return account[0];
    } catch (error) {
      console.error('[WellService] Error accounting task:', error);
      throw error;
    }
  }

  static async getPendingAccountingTasks(project_id?: string) {
    try {
      let baseQuery = db.select({
        task: wellTasks,
        well: wells,
      })
        .from(wellTasks)
        .leftJoin(wellTaskAccounts, eq(wellTasks.id, wellTaskAccounts.taskId))
        .innerJoin(wells, eq(wellTasks.well_id, wells.id))
        .where(
          and(
            eq(wellTasks.status, 'completed'),
            isNull(wellTaskAccounts.id)
          )
        );

      if (project_id) {
        baseQuery = baseQuery.where(
          and(
            eq(wellTasks.status, 'completed'),
            isNull(wellTaskAccounts.id),
            eq(wells.project_id, project_id)
          )
        ) as typeof baseQuery;
      }

      const results = await baseQuery.orderBy(asc(wellTasks.created_at));
      return results.map(row => ({
        ...row.task,
        well: row.well,
      }));
    } catch (error) {
      console.error('[WellService] Error fetching pending accounting tasks:', error);
      throw error;
    }
  }

  static async getWellProgress(well_id: number) {
    try {
      const well = await this.getWellById(well_id);
      const tasks = await this.getWellTasks(well_id);

      const completedTasks = tasks.filter((t: any) => t.status === 'completed');
      const accountedTasks = tasks.filter((t: any) => t.isAccounted);

      return {
        well,
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        accountedTasks: accountedTasks.length,
        completionPercentage: tasks.length > 0 
          ? Math.round((completedTasks.length / tasks.length) * 100)
          : 0
      };
    } catch (error) {
      console.error('[WellService] Error computing well progress:', error);
      throw error;
    }
  }

  static async getWellsFullExportData(project_id?: string) {
    try {
      const wellsList = project_id
        ? await db.select().from(wells).where(eq(wells.project_id, project_id)).orderBy(wells.wellNumber)
        : await db.select().from(wells).orderBy(wells.wellNumber);

      const wellIds = wellsList.map(w => w.id);
      if (wellIds.length === 0) return [];

      const [allCrews, allSolar, allTransport, allReceptions, allTasks] = await Promise.all([
        db.select().from(wellWorkCrews).where(inArray(wellWorkCrews.well_id, wellIds)).orderBy(wellWorkCrews.well_id, wellWorkCrews.crewType),
        db.select().from(wellSolarComponents).where(inArray(wellSolarComponents.well_id, wellIds)),
        db.select().from(wellTransportDetails).where(inArray(wellTransportDetails.well_id, wellIds)).orderBy(wellTransportDetails.well_id),
        db.select().from(wellReceptions).where(inArray(wellReceptions.well_id, wellIds)).orderBy(desc(wellReceptions.created_at)),
        db.select().from(wellTasks).where(inArray(wellTasks.well_id, wellIds)).orderBy(wellTasks.well_id),
      ]);

      const crewsByWell = new Map<number, any[]>();
      for (const c of allCrews) { const arr = crewsByWell.get(c.well_id) || []; arr.push(c); crewsByWell.set(c.well_id, arr); }
      const solarByWell = new Map<number, any>();
      for (const s of allSolar) { solarByWell.set(s.well_id, s); }
      const transportByWell = new Map<number, any[]>();
      for (const t of allTransport) { const arr = transportByWell.get(t.well_id) || []; arr.push(t); transportByWell.set(t.well_id, arr); }
      const receptionsByWell = new Map<number, any[]>();
      for (const r of allReceptions) { const arr = receptionsByWell.get(r.well_id) || []; arr.push(r); receptionsByWell.set(r.well_id, arr); }
      const tasksByWell = new Map<number, any[]>();
      for (const t of allTasks) { const arr = tasksByWell.get(t.well_id) || []; arr.push(t); tasksByWell.set(t.well_id, arr); }

      return wellsList.map(well => ({
        ...well,
        crews: crewsByWell.get(well.id) || [],
        solar: solarByWell.get(well.id) || null,
        transport: transportByWell.get(well.id) || [],
        receptions: receptionsByWell.get(well.id) || [],
        tasks: tasksByWell.get(well.id) || [],
      }));
    } catch (error) {
      console.error('[WellService] Error fetching full export data:', error);
      throw error;
    }
  }

  static async getProjectWellsSummary(project_id: string) {
    try {
      const projectWells = await this.getAllWells(project_id);

      const summary = {
        totalWells: projectWells.length,
        pendingWells: projectWells.filter((w: any) => w.status === 'pending').length,
        inProgressWells: projectWells.filter((w: any) => w.status === 'in_progress').length,
        completedWells: projectWells.filter((w: any) => w.status === 'completed').length,
        averageCompletion: projectWells.length > 0
          ? Math.round(
              projectWells.reduce((sum: number, w: any) => sum + (parseFloat(String(w.completionPercentage)) || 0), 0) / projectWells.length
            )
          : 0
      };

      return summary;
    } catch (error) {
      console.error('[WellService] Error computing project wells summary:', error);
      throw error;
    }
  }

  /**
   * طواقم العمل (Work Crews)
   */

  static async getWellCrews(well_id: number) {
    try {
      return await db.select()
        .from(wellWorkCrews)
        .where(eq(wellWorkCrews.well_id, well_id))
        .orderBy(desc(wellWorkCrews.created_at));
    } catch (error) {
      console.error('[WellService] Error fetching well crews:', error);
      throw error;
    }
  }

  static async getCrewById(crewId: number) {
    try {
      const crew = await db.select()
        .from(wellWorkCrews)
        .where(eq(wellWorkCrews.id, crewId))
        .limit(1);
      return crew.length ? crew[0] : null;
    } catch (error) {
      console.error('[WellService] Error fetching crew:', error);
      throw error;
    }
  }

  static async createCrew(well_id: number, data: any, userId: string) {
    try {
      const totalWages = (
        (Number(data.workersCount || 0) * Number(data.workerDailyWage || 0) * Number(data.workDays || 0)) +
        (Number(data.mastersCount || 0) * Number(data.masterDailyWage || 0) * Number(data.workDays || 0))
      );

      const result = await db.insert(wellWorkCrews).values({
        well_id,
        crewType: data.crewType,
        teamName: data.teamName || null,
        workersCount: data.workersCount || 0,
        mastersCount: data.mastersCount || 0,
        workDays: String(data.workDays || 0),
        workerDailyWage: data.workerDailyWage ? String(data.workerDailyWage) : null,
        masterDailyWage: data.masterDailyWage ? String(data.masterDailyWage) : null,
        totalWages: String(totalWages),
        crewDues: data.crewDues ? String(data.crewDues) : null,
        workDate: data.workDate || null,
        notes: data.notes || null,
        createdBy: userId,
      }).returning();

      return result[0];
    } catch (error) {
      console.error('[WellService] Error creating crew:', error);
      throw error;
    }
  }

  static async updateCrew(crewId: number, data: any) {
    try {
      const updateData: any = { updated_at: new Date() };
      if (data.crewType !== undefined) updateData.crewType = data.crewType;
      if (data.teamName !== undefined) updateData.teamName = data.teamName;
      if (data.workersCount !== undefined) updateData.workersCount = data.workersCount;
      if (data.mastersCount !== undefined) updateData.mastersCount = data.mastersCount;
      if (data.workDays !== undefined) updateData.workDays = String(data.workDays);
      if (data.workerDailyWage !== undefined) updateData.workerDailyWage = String(data.workerDailyWage);
      if (data.masterDailyWage !== undefined) updateData.masterDailyWage = String(data.masterDailyWage);
      if (data.crewDues !== undefined) updateData.crewDues = data.crewDues ? String(data.crewDues) : null;
      if (data.workDate !== undefined) updateData.workDate = data.workDate;
      if (data.notes !== undefined) updateData.notes = data.notes;

      if (data.workersCount !== undefined || data.mastersCount !== undefined ||
          data.workerDailyWage !== undefined || data.masterDailyWage !== undefined ||
          data.workDays !== undefined) {
        const existing = await this.getCrewById(crewId);
        const wc = data.workersCount ?? existing?.workersCount ?? 0;
        const mc = data.mastersCount ?? existing?.mastersCount ?? 0;
        const wd = data.workDays ?? existing?.workDays ?? 0;
        const ww = data.workerDailyWage ?? existing?.workerDailyWage ?? 0;
        const mw = data.masterDailyWage ?? existing?.masterDailyWage ?? 0;
        updateData.totalWages = String(
          (Number(wc) * Number(ww) * Number(wd)) + (Number(mc) * Number(mw) * Number(wd))
        );
      }

      const result = await db.update(wellWorkCrews)
        .set(updateData)
        .where(eq(wellWorkCrews.id, crewId))
        .returning();

      return result[0];
    } catch (error) {
      console.error('[WellService] Error updating crew:', error);
      throw error;
    }
  }

  static async deleteCrew(crewId: number) {
    try {
      await db.delete(wellWorkCrews).where(eq(wellWorkCrews.id, crewId));
    } catch (error) {
      console.error('[WellService] Error deleting crew:', error);
      throw error;
    }
  }

  /**
   * مكونات الطاقة الشمسية (Solar Components)
   */

  static async getWellSolarComponents(well_id: number) {
    try {
      const result = await db.select()
        .from(wellSolarComponents)
        .where(eq(wellSolarComponents.well_id, well_id))
        .limit(1);
      return result.length ? result[0] : null;
    } catch (error) {
      console.error('[WellService] Error fetching solar components:', error);
      throw error;
    }
  }

  static async upsertSolarComponents(well_id: number, data: any, userId: string) {
    try {
      const existing = await this.getWellSolarComponents(well_id);

      if (existing) {
        const updateData: any = { updated_at: new Date() };
        for (const key of Object.keys(data)) {
          if (key !== 'well_id' && key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
            updateData[key] = data[key];
          }
        }

        const result = await db.update(wellSolarComponents)
          .set(updateData)
          .where(eq(wellSolarComponents.well_id, well_id))
          .returning();
        return result[0];
      } else {
        const result = await db.insert(wellSolarComponents).values({
          well_id,
          inverter: data.inverter ?? "1",
          collectionBox: data.collectionBox ?? "1",
          carbonCarrier: data.carbonCarrier ?? "1",
          steelConverterTop: data.steelConverterTop ?? "1",
          clampConverterBottom: data.clampConverterBottom ?? "1",
          bindingCable6mm: data.bindingCable6mm ?? "1",
          groundingCable10x2mm: data.groundingCable10x2mm ?? "1",
          jointThermalLiquid: data.jointThermalLiquid ?? "1",
          groundingClip: data.groundingClip ?? "1",
          groundingPlate: data.groundingPlate ?? "1",
          groundingRod: data.groundingRod ?? "1",
          cable16x3mmLength: data.cable16x3mmLength ? String(data.cable16x3mmLength) : null,
          cable10x2mmLength: data.cable10x2mmLength ? String(data.cable10x2mmLength) : null,
          extraPipes: data.extraPipes ?? 0,
          extraPipesReason: data.extraPipesReason ?? null,
          extraCable: data.extraCable ? String(data.extraCable) : "0",
          extraCableReason: data.extraCableReason ?? null,
          fanCount: data.fanCount ?? 1,
          submersiblePump: data.submersiblePump ?? true,
          installationStatus: data.installationStatus ?? 'not_installed',
          installedComponents: data.installedComponents ?? null,
          notes: data.notes ?? null,
          createdBy: userId,
        }).returning();
        return result[0];
      }
    } catch (error) {
      console.error('[WellService] Error upserting solar components:', error);
      throw error;
    }
  }

  static async deleteSolarComponents(well_id: number) {
    try {
      await db.delete(wellSolarComponents).where(eq(wellSolarComponents.well_id, well_id));
    } catch (error) {
      console.error('[WellService] Error deleting solar components:', error);
      throw error;
    }
  }

  /**
   * تفاصيل النقل (Transport Details)
   */

  static async getWellTransportDetails(well_id: number) {
    try {
      return await db.select()
        .from(wellTransportDetails)
        .where(eq(wellTransportDetails.well_id, well_id))
        .orderBy(desc(wellTransportDetails.created_at));
    } catch (error) {
      console.error('[WellService] Error fetching transport details:', error);
      throw error;
    }
  }

  static async getTransportDetailById(transportId: number) {
    try {
      const result = await db.select()
        .from(wellTransportDetails)
        .where(eq(wellTransportDetails.id, transportId))
        .limit(1);
      return result.length ? result[0] : null;
    } catch (error) {
      console.error('[WellService] Error fetching transport detail:', error);
      throw error;
    }
  }

  static async createTransportDetail(well_id: number, data: any, userId: string) {
    try {
      const result = await db.insert(wellTransportDetails).values({
        well_id,
        railType: data.railType || null,
        withPanels: data.withPanels ?? false,
        transportPrice: data.transportPrice ? String(data.transportPrice) : null,
        crewEntitlements: data.crewEntitlements ? String(data.crewEntitlements) : null,
        transportDate: data.transportDate || null,
        notes: data.notes || null,
        createdBy: userId,
      }).returning();

      return result[0];
    } catch (error) {
      console.error('[WellService] Error creating transport detail:', error);
      throw error;
    }
  }

  static async updateTransportDetail(transportId: number, data: any) {
    try {
      const updateData: any = {};
      if (data.railType !== undefined) updateData.railType = data.railType;
      if (data.withPanels !== undefined) updateData.withPanels = data.withPanels;
      if (data.transportPrice !== undefined) updateData.transportPrice = String(data.transportPrice);
      if (data.crewEntitlements !== undefined) updateData.crewEntitlements = String(data.crewEntitlements);
      if (data.transportDate !== undefined) updateData.transportDate = data.transportDate;
      if (data.notes !== undefined) updateData.notes = data.notes;

      const result = await db.update(wellTransportDetails)
        .set(updateData)
        .where(eq(wellTransportDetails.id, transportId))
        .returning();

      return result[0];
    } catch (error) {
      console.error('[WellService] Error updating transport detail:', error);
      throw error;
    }
  }

  static async deleteTransportDetail(transportId: number) {
    try {
      await db.delete(wellTransportDetails).where(eq(wellTransportDetails.id, transportId));
    } catch (error) {
      console.error('[WellService] Error deleting transport detail:', error);
      throw error;
    }
  }

  /**
   * استلام الآبار (Receptions)
   */

  static async getWellReceptions(well_id: number) {
    try {
      return await db.select()
        .from(wellReceptions)
        .where(eq(wellReceptions.well_id, well_id))
        .orderBy(desc(wellReceptions.created_at));
    } catch (error) {
      console.error('[WellService] Error fetching receptions:', error);
      throw error;
    }
  }

  static async getReceptionById(receptionId: number) {
    try {
      const result = await db.select()
        .from(wellReceptions)
        .where(eq(wellReceptions.id, receptionId))
        .limit(1);
      return result.length ? result[0] : null;
    } catch (error) {
      console.error('[WellService] Error fetching reception:', error);
      throw error;
    }
  }

  static async createReception(well_id: number, data: any, userId: string) {
    try {
      const result = await db.insert(wellReceptions).values({
        well_id,
        receivedBy: data.receivedBy || null,
        receiverName: data.receiverName || null,
        inspectionStatus: data.inspectionStatus || 'pending',
        inspectionNotes: data.inspectionNotes || null,
        receivedAt: data.receivedAt ? new Date(data.receivedAt) : null,
        receptionDate: data.receptionDate || null,
        engineers: data.engineers || null,
        notes: data.notes || null,
        createdBy: userId,
      }).returning();

      return result[0];
    } catch (error) {
      console.error('[WellService] Error creating reception:', error);
      throw error;
    }
  }

  static async updateReception(receptionId: number, data: any) {
    try {
      const updateData: any = {};
      if (data.receivedBy !== undefined) updateData.receivedBy = data.receivedBy;
      if (data.receiverName !== undefined) updateData.receiverName = data.receiverName;
      if (data.inspectionStatus !== undefined) updateData.inspectionStatus = data.inspectionStatus;
      if (data.inspectionNotes !== undefined) updateData.inspectionNotes = data.inspectionNotes;
      if (data.receivedAt !== undefined) updateData.receivedAt = data.receivedAt ? new Date(data.receivedAt) : null;
      if (data.receptionDate !== undefined) updateData.receptionDate = data.receptionDate || null;
      if (data.engineers !== undefined) updateData.engineers = data.engineers || null;
      if (data.notes !== undefined) updateData.notes = data.notes;

      const result = await db.update(wellReceptions)
        .set(updateData)
        .where(eq(wellReceptions.id, receptionId))
        .returning();

      return result[0];
    } catch (error) {
      console.error('[WellService] Error updating reception:', error);
      throw error;
    }
  }

  static async deleteReception(receptionId: number) {
    try {
      await db.delete(wellReceptions).where(eq(wellReceptions.id, receptionId));
    } catch (error) {
      console.error('[WellService] Error deleting reception:', error);
      throw error;
    }
  }

  /**
   * تكاليف الطواقم والنقل للتقارير
   */

  static async getWellCrewsCost(well_id: number): Promise<number> {
    try {
      const crews = await this.getWellCrews(well_id);
      return crews.reduce((sum, c: any) => sum + (parseFloat(String(c.totalWages)) || 0), 0);
    } catch (error) {
      return 0;
    }
  }

  static async getWellTransportCost(well_id: number): Promise<number> {
    try {
      const details = await this.getWellTransportDetails(well_id);
      return details.reduce((sum, d: any) => {
        return sum + (parseFloat(String(d.transportPrice)) || 0) + (parseFloat(String(d.crewEntitlements)) || 0);
      }, 0);
    } catch (error) {
      return 0;
    }
  }
}

export default WellService;
