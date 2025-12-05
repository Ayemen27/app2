import type { RxJsonSchema } from 'rxdb';
import type { Worker } from '../schema';

export const workerSchema: RxJsonSchema<Worker> = {
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
    name: {
      type: 'string',
    },
    phone: {
      type: 'string',
    },
    nationalId: {
      type: 'string',
    },
    workerType: {
      type: 'string',
      enum: ['skilled', 'unskilled', 'supervisor', 'driver', 'other'],
    },
    dailyWage: {
      type: 'number',
    },
    projectId: {
      type: 'string',
    },
    status: {
      type: 'string',
      enum: ['active', 'inactive', 'terminated'],
    },
    startDate: {
      type: 'string',
    },
    notes: {
      type: 'string',
    },
    photoPath: {
      type: 'string',
    },
  },
  required: ['id', 'createdAt', 'updatedAt', 'syncStatus', 'originDeviceId', 'version', 'isDeleted', 'name', 'workerType', 'dailyWage', 'status'],
  indexes: ['createdAt', 'updatedAt', 'syncStatus', 'projectId', 'status', 'workerType', 'name'],
};
