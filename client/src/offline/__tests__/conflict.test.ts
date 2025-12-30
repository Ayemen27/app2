import { describe, it, expect } from 'vitest';
// @ts-ignore
import { resolveConflict } from '../conflict-resolver';

describe('Conflict Resolution Tests', () => {
  it('should resolve conflicts using "Latest Wins" strategy', () => {
    const serverData = { id: 1, amount: 100, updatedAt: '2025-01-01T10:00:00Z' };
    const clientData = { id: 1, amount: 150, updatedAt: '2025-01-01T10:05:00Z' };
    
    // @ts-ignore
    const resolved = resolveConflict(serverData, clientData, 'latest_wins');
    expect(resolved.amount).toBe(150);
  });
});
