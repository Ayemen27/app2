import type { RxJsonSchema } from 'rxdb';
import type { FundTransfer } from '../schema';

export const transferSchema: RxJsonSchema<FundTransfer> = {
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
    date: {
      type: 'string',
    },
    amount: {
      type: 'number',
    },
    transferType: {
      type: 'string',
      enum: ['cash', 'bank', 'check', 'mobile'],
    },
    senderName: {
      type: 'string',
    },
    transferNumber: {
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
    approvalStatus: {
      type: 'string',
      enum: ['pending', 'approved', 'rejected'],
    },
  },
  required: ['id', 'createdAt', 'updatedAt', 'syncStatus', 'originDeviceId', 'version', 'isDeleted', 'projectId', 'date', 'amount', 'transferType', 'attachmentIds'],
  indexes: ['createdAt', 'updatedAt', 'syncStatus', 'projectId', 'date', 'transferType', 'approvalStatus', ['projectId', 'date']],
};
