import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HybridLogicalClock, formatHlc, parseHlc, compareHlc, pickWinnerByHlc } from '../../../../shared/hlc';

describe('HybridLogicalClock', () => {
  let hlc: HybridLogicalClock;
  const nodeId = 'node-test';

  beforeEach(() => {
    hlc = new HybridLogicalClock(nodeId);
    vi.useFakeTimers();
  });

  it('generates increasing timestamps in the same millisecond', () => {
    const t1 = Date.now();
    const h1 = hlc.now();
    const h2 = hlc.now();
    
    expect(h1).not.toBe(h2);
    expect(h2 > h1).toBe(true);
    
    const p1 = parseHlc(h1);
    const p2 = parseHlc(h2);
    
    expect(p1?.physical).toBe(t1);
    expect(p2?.physical).toBe(t1);
    expect(p2!.logical).toBe(p1!.logical + 1);
  });

  it('handles clock drift correctly', () => {
    const t1 = Date.now();
    const h1 = hlc.now();
    
    // Simulate time moving forward
    vi.advanceTimersByTime(1000);
    const h2 = hlc.now();
    
    expect(h2 > h1).toBe(true);
    const p2 = parseHlc(h2);
    expect(p2?.physical).toBe(t1 + 1000);
    expect(p2?.logical).toBe(0);
  });

  it('handles wall-time backwards', () => {
    const t1 = Date.now();
    const h1 = hlc.now();
    
    // Simulate clock jumping back
    vi.setSystemTime(t1 - 1000);
    const h2 = hlc.now();
    
    expect(h2 > h1).toBe(true);
    const p2 = parseHlc(h2);
    expect(p2?.physical).toBe(t1);
    expect(p2?.logical).toBe(1);
  });

  it('receive handles remote drift > 60s', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const now = Date.now();
    
    // Future HLC (more than 60s)
    const futureHlc = formatHlc({
      physical: now + 70000,
      logical: 0,
      nodeId: 'remote'
    });
    
    const resultHlc = hlc.receive(futureHlc);
    // Use the actual Arabic word or substring from the warning
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('ينحرف'));
    
    const pResult = parseHlc(resultHlc);
    expect(pResult?.physical).toBe(now + 70000);
  });

  it('pickWinnerByHlc chooses the correct winner', () => {
    const a = { id: '1', hlc_timestamp: '000000000000100-00000-node1' };
    const b = { id: '2', hlc_timestamp: '000000000000200-00000-node2' };
    
    expect(pickWinnerByHlc(a, b)).toBe(b);
    expect(pickWinnerByHlc(b, a)).toBe(b);
  });

  it('tie-breaking works via node_id (because of lexicographical sort)', () => {
    const a = { id: '1', hlc_timestamp: '000000000000100-00000-nodeA' };
    const b = { id: '2', hlc_timestamp: '000000000000100-00000-nodeB' };
    
    expect(pickWinnerByHlc(a, b)).toBe(b); // nodeB > nodeA
  });
});
