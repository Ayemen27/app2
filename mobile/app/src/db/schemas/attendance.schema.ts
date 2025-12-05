import type { RxJsonSchema } from 'rxdb';
import type { WorkerAttendance } from '../schema';

export const attendanceSchema: RxJsonSchema<WorkerAttendance> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    createdAt: {
      type: 'number',
    },
    updatedAt: {
      type: 'number',
    },
    syncStatus: {
      type: 'string',
      enum: ['pending', 'syncing', 'synced', 'conflict', 'error'],
    },
    originDeviceId: {
      type: 'string',
    },
    version: {
      type: 'number',
    },
    isDeleted: {
      type: 'boolean',
    },
    workerId: {
      type: 'string',
    },
    projectId: {
      type: 'string',
    },
    date: {
      type: 'string',
    },
    workDays: {
      type: 'number',
    },
    dailyWage: {
      type: 'number',
    },
    paidAmount: {
      type: 'number',
    },
    notes: {
      type: 'string',
    },
    geoTag: {
      type: 'object',
      properties: {
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        accuracy: { type: 'number' },
        address: { type: 'string' },
      },
    },
  },
  required: ['id', 'createdAt', 'updatedAt', 'syncStatus', 'originDeviceId', 'version', 'isDeleted', 'workerId', 'projectId', 'date', 'workDays', 'dailyWage', 'paidAmount'],
  indexes: ['createdAt', 'updatedAt', 'syncStatus', 'workerId', 'projectId', 'date', ['projectId', 'date']],
};
