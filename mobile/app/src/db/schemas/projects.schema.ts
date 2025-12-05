import type { RxJsonSchema } from 'rxdb';
import type { Project } from '../schema';

export const projectSchema: RxJsonSchema<Project> = {
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
    description: {
      type: 'string',
    },
    status: {
      type: 'string',
      enum: ['active', 'completed', 'suspended', 'cancelled'],
    },
    startDate: {
      type: 'string',
    },
    endDate: {
      type: 'string',
    },
    budget: {
      type: 'number',
    },
    location: {
      type: 'object',
      properties: {
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        accuracy: { type: 'number' },
        address: { type: 'string' },
      },
    },
    managerId: {
      type: 'string',
    },
    notes: {
      type: 'string',
    },
  },
  required: ['id', 'createdAt', 'updatedAt', 'syncStatus', 'originDeviceId', 'version', 'isDeleted', 'name', 'status'],
  indexes: ['createdAt', 'updatedAt', 'syncStatus', 'status', 'name'],
};
