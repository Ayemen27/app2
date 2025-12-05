import type { RxJsonSchema } from 'rxdb';
import type { Supplier } from '../schema';

export const supplierSchema: RxJsonSchema<Supplier> = {
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
    address: {
      type: 'string',
    },
    category: {
      type: 'string',
    },
    balance: {
      type: 'number',
    },
    notes: {
      type: 'string',
    },
  },
  required: ['id', 'createdAt', 'updatedAt', 'syncStatus', 'originDeviceId', 'version', 'isDeleted', 'name', 'balance'],
  indexes: ['createdAt', 'updatedAt', 'syncStatus', 'name', 'category'],
};
