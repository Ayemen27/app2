import { describe, it, expect } from 'vitest';
import {
  resolveConflict,
  resolveConflictLWW,
  resolveConflictServerWins,
  resolveConflictClientWins,
  resolveConflictMerge,
  detectConflict,
  getConflictingFields,
  ConflictError
} from '../conflict-resolver';
import type { ConflictData } from '../conflict-resolver';

describe('Conflict Resolution Tests', () => {
  const baseConflict: ConflictData = {
    clientVersion: { id: 1, amount: 150, name: 'عميل' },
    serverVersion: { id: 1, amount: 100, name: 'خادم' },
    clientTimestamp: 1700000005000,
    serverTimestamp: 1700000000000,
  };

  describe('resolveConflictLWW - آخر كتابة تفوز', () => {
    it('يجب أن يختار النسخة المحلية عندما تكون أحدث', () => {
      const result = resolveConflictLWW(baseConflict);
      expect(result).toEqual(baseConflict.clientVersion);
    });

    it('يجب أن يختار نسخة الخادم عندما تكون أحدث', () => {
      const conflict: ConflictData = {
        ...baseConflict,
        clientTimestamp: 1700000000000,
        serverTimestamp: 1700000005000,
      };
      const result = resolveConflictLWW(conflict);
      expect(result).toEqual(conflict.serverVersion);
    });
  });

  describe('resolveConflictServerWins - تفضيل الخادم', () => {
    it('يجب أن يعيد نسخة الخادم دائماً', () => {
      const result = resolveConflictServerWins(baseConflict);
      expect(result).toEqual(baseConflict.serverVersion);
    });
  });

  describe('resolveConflictClientWins - تفضيل العميل', () => {
    it('يجب أن يعيد نسخة العميل دائماً', () => {
      const result = resolveConflictClientWins(baseConflict);
      expect(result).toEqual(baseConflict.clientVersion);
    });
  });

  describe('resolveConflictMerge - الدمج', () => {
    it('يجب أن يدمج الحقول الجديدة من العميل', () => {
      const result = resolveConflictMerge(
        { id: 1, amount: 150, extra: 'جديد' },
        { id: 1, amount: 100 },
        1700000005000,
        1700000000000
      );
      expect(result.extra).toBe('جديد');
    });

    it('يجب أن يختار قيمة الأحدث عند تضارب الحقول', () => {
      const result = resolveConflictMerge(
        { id: 1, amount: 150 },
        { id: 1, amount: 100 },
        1700000005000,
        1700000000000
      );
      expect(result.amount).toBe(150);
    });
  });

  describe('resolveConflict - الاستراتيجية الموحدة', () => {
    it('يجب أن يعيد null عند عدم وجود بيانات', () => {
      const conflict: ConflictData = {
        clientVersion: null,
        serverVersion: null,
        clientTimestamp: 0,
        serverTimestamp: 0,
      };
      const result = resolveConflict(conflict);
      expect(result).toBeNull();
    });

    it('يجب أن يعيد نسخة الخادم عند فقدان نسخة العميل', () => {
      const conflict: ConflictData = {
        clientVersion: null,
        serverVersion: { id: 1 },
        clientTimestamp: 0,
        serverTimestamp: 1700000000000,
      };
      const result = resolveConflict(conflict);
      expect(result).toEqual({ id: 1 });
    });

    it('يجب أن يستخدم last-write-wins عند تحديد الاستراتيجية', () => {
      const result = resolveConflict(baseConflict, { strategy: 'last-write-wins' });
      expect(result).toEqual(baseConflict.clientVersion);
    });

    it('يجب أن يستخدم server-wins عند تحديد الاستراتيجية', () => {
      const result = resolveConflict(baseConflict, { strategy: 'server-wins' });
      expect(result).toEqual(baseConflict.serverVersion);
    });
  });

  describe('detectConflict - اكتشاف التضارب', () => {
    it('يجب أن يكتشف التضارب بين بيانات مختلفة', () => {
      const result = detectConflict({ amount: 100 }, { amount: 200 });
      expect(result).toBe(true);
    });

    it('يجب ألا يكتشف تضارب بين بيانات متطابقة', () => {
      const result = detectConflict({ amount: 100 }, { amount: 100 });
      expect(result).toBe(false);
    });

    it('يجب أن يكتشف حقول جديدة كتضارب', () => {
      const result = detectConflict({ a: 1, b: 2 }, { a: 1 });
      expect(result).toBe(true);
    });
  });

  describe('getConflictingFields - الحقول المتضاربة', () => {
    it('يجب أن يعيد قائمة الحقول المتضاربة', () => {
      const fields = getConflictingFields(
        { a: 1, b: 2, c: 3 },
        { a: 1, b: 5, c: 3 }
      );
      expect(fields).toEqual(['b']);
    });

    it('يجب أن يعيد قائمة فارغة عند عدم وجود تضارب', () => {
      const fields = getConflictingFields({ a: 1 }, { a: 1 });
      expect(fields).toEqual([]);
    });
  });

  describe('ConflictError', () => {
    it('يجب أن ينشئ خطأ تضارب صحيح', () => {
      const error = new ConflictError('amount', 150, 100, 150);
      expect(error.name).toBe('ConflictError');
      expect(error.field).toBe('amount');
      expect(error.clientValue).toBe(150);
      expect(error.serverValue).toBe(100);
    });
  });
});
