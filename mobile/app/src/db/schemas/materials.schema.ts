import type { RxJsonSchema } from 'rxdb';
import type { MaterialPurchase } from '../schema';

export const materialSchema: RxJsonSchema<MaterialPurchase> = {
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
    projectId: {
      type: 'string',
    },
    supplierId: {
      type: 'string',
    },
    date: {
      type: 'string',
    },
    materialName: {
      type: 'string',
    },
    quantity: {
      type: 'number',
    },
    unit: {
      type: 'string',
    },
    unitPrice: {
      type: 'number',
    },
    totalAmount: {
      type: 'number',
    },
    paidAmount: {
      type: 'number',
    },
    invoiceNumber: {
      type: 'string',
    },
    notes: {
      type: 'string',
    },
    attachmentIds: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
  required: ['id', 'createdAt', 'updatedAt', 'syncStatus', 'originDeviceId', 'version', 'isDeleted', 'projectId', 'date', 'materialName', 'quantity', 'unit', 'unitPrice', 'totalAmount', 'paidAmount', 'attachmentIds'],
  indexes: ['createdAt', 'updatedAt', 'syncStatus', 'projectId', 'supplierId', 'date', 'materialName', ['projectId', 'date']],
};
