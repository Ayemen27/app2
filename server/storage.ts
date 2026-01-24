import { 
  devices, monitoringMetrics, errorLogs,
  type Device, type InsertDevice, 
  type MonitoringMetric, type InsertMetric,
  type ErrorLog, type InsertError 
} from "@shared/schema";

export interface IStorage {
  // Devices
  registerDevice(device: InsertDevice): Promise<Device>;
  getDevice(deviceId: string): Promise<Device | undefined>;
  listDevices(): Promise<Device[]>;
  
  // Metrics
  addMetric(metric: InsertMetric): Promise<MonitoringMetric>;
  getMetrics(deviceId: string): Promise<MonitoringMetric[]>;
  
  // Errors
  logError(error: InsertError): Promise<ErrorLog>;
  getErrors(deviceId: string): Promise<ErrorLog[]>;
}

export class MemStorage implements IStorage {
  private devicesMap: Map<string, Device>;
  private metricsList: MonitoringMetric[];
  private errorsList: ErrorLog[];
  private currentId: number;

  constructor() {
    this.devicesMap = new Map();
    this.metricsList = [];
    this.errorsList = [];
    this.currentId = 1;
  }

  async registerDevice(insertDevice: InsertDevice): Promise<Device> {
    const id = this.currentId++;
    const device: Device = { ...insertDevice, id, lastSeen: new Date(), status: "active" };
    this.devicesMap.set(device.deviceId, device);
    return device;
  }

  async getDevice(deviceId: string): Promise<Device | undefined> {
    return this.devicesMap.get(deviceId);
  }

  async listDevices(): Promise<Device[]> {
    return Array.from(this.devicesMap.values());
  }

  async addMetric(insertMetric: InsertMetric): Promise<MonitoringMetric> {
    const id = this.currentId++;
    const metric: MonitoringMetric = { ...insertMetric, id, timestamp: new Date() };
    this.metricsList.push(metric);
    return metric;
  }

  async getMetrics(deviceId: string): Promise<MonitoringMetric[]> {
    return this.metricsList.filter(m => m.deviceId === deviceId);
  }

  async logError(insertError: InsertError): Promise<ErrorLog> {
    const id = this.currentId++;
    const error: ErrorLog = { ...insertError, id, timestamp: new Date() };
    this.errorsList.push(error);
    return error;
  }

  async getErrors(deviceId: string): Promise<ErrorLog[]> {
    return this.errorsList.filter(e => e.deviceId === deviceId);
  }
}

export const storage = new MemStorage();
