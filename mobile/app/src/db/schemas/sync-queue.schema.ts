import type { RxJsonSchema } from 'rxdb';
import type { SyncQueueItem } from '../schema';

export const syncQueueSchema: RxJsonSchema<SyncQueueItem> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    operation: {
      type: 'string',
      enum: ['create', 'update', 'delete'],
    },
    tableName: {
      type: 'string',
    },
    entityId: {
      type: 'string',
    },
    payload: {
      type: 'object',
    },
    createdAt: {
      type: 'number',
    },
    retryCount: {
      type: 'number',
    },
    lastError: {
      type: 'string',
    },
    priority: {
      type: 'number',
    },
    status: {
      type: 'string',
      enum: ['pending', 'processing', 'completed', 'failed'],
    },
  },
  required: ['id', 'operation', 'tableName', 'entityId', 'payload', 'createdAt', 'retryCount', 'priority', 'status'],
  indexes: ['createdAt', 'status', 'priority', 'tableName', ['status', 'priority']],
};
