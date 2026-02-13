import { describe, it, expect } from 'vitest';
import { ALL_SYNC_TABLES } from '../sync';

describe('Sync Engine Structure Tests', () => {
  it('يجب أن تحتوي قائمة المزامنة على الجداول الأساسية', () => {
    const requiredTables = ['users', 'projects', 'workers', 'wells', 'suppliers', 'materials'];
    for (const table of requiredTables) {
      expect(ALL_SYNC_TABLES).toContain(table);
    }
  });

  it('يجب ألا تحتوي قائمة المزامنة على جداول مكررة', () => {
    const uniqueTables = new Set(ALL_SYNC_TABLES);
    expect(uniqueTables.size).toBe(ALL_SYNC_TABLES.length);
  });

  it('يجب أن تحتوي قائمة المزامنة على جداول الأمان', () => {
    const securityTables = ['security_policies', 'security_policy_suggestions'];
    for (const table of securityTables) {
      expect(ALL_SYNC_TABLES).toContain(table);
    }
  });

  it('يجب أن تحتوي قائمة المزامنة على جداول الذكاء الاصطناعي', () => {
    const aiTables = ['ai_chat_sessions', 'ai_chat_messages', 'ai_usage_stats'];
    for (const table of aiTables) {
      expect(ALL_SYNC_TABLES).toContain(table);
    }
  });

  it('يجب أن تحتوي قائمة المزامنة على جداول المعدات', () => {
    const toolTables = ['tools', 'tool_stock', 'tool_movements'];
    for (const table of toolTables) {
      expect(ALL_SYNC_TABLES).toContain(table);
    }
  });
});
