import type { RxJsonSchema } from 'rxdb';
import type { Attachment } from '../schema';

export const attachmentSchema: RxJsonSchema<Attachment> = {
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
    localPath: {
      type: 'string',
    },
    remotePath: {
      type: 'string',
    },
    fileName: {
      type: 'string',
    },
    mimeType: {
      type: 'string',
    },
    size: {
      type: 'number',
    },
    uploadStatus: {
      type: 'string',
      enum: ['local', 'uploading', 'uploaded', 'failed'],
    },
    entityType: {
      type: 'string',
    },
    entityId: {
      type: 'string',
    },
    thumbnailPath: {
      type: 'string',
    },
  },
  required: ['id', 'createdAt', 'updatedAt', 'syncStatus', 'originDeviceId', 'version', 'isDeleted', 'localPath', 'fileName', 'mimeType', 'size', 'uploadStatus', 'entityType', 'entityId'],
  indexes: ['createdAt', 'updatedAt', 'syncStatus', 'uploadStatus', 'entityType', 'entityId', ['entityType', 'entityId']],
};
