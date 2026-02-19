import { describe, it, expect } from 'vitest';
import { getCyclePhase, getTsundereComment } from './cycle-phase';

describe('getCyclePhase', () => {
  it('lastPeriodDate が空のとき null を返す', () => {
    expect(getCyclePhase('2025-02-12', '', 28, 5)).toBeNull();
  });

  it('生理初日は period フェーズを返す', () => {
    const result = getCyclePhase('2025-02-10', '2025-02-10', 28, 5);
    expect(result?.phase).toBe('period');
    expect(result?.dayInCycle).toBe(1);
  });

  it('生理5日目は period フェーズ', () => {
    const result = getCyclePhase('2025-02-14', '2025-02-10', 28, 5);
    expect(result?.phase).toBe('period');
    expect(result?.dayInCycle).toBe(5);
  });

  it('卵胞期を正しく判定する', () => {
    const result = getCyclePhase('2025-02-18', '2025-02-10', 28, 5);
    expect(result?.phase).toBe('follicular');
  });

  it('排卵期を正しく判定する', () => {
    const result = getCyclePhase('2025-02-22', '2025-02-10', 28, 5);
    expect(result?.phase).toBe('ovulation');
  });

  it('黄体期前半を正しく判定する', () => {
    const result = getCyclePhase('2025-02-25', '2025-02-10', 28, 5);
    expect(result?.phase).toBe('luteal_early');
  });

  it('PMS期間を正しく判定する', () => {
    const result = getCyclePhase('2025-03-05', '2025-02-10', 28, 5);
    expect(result?.phase).toBe('pms');
  });
});

describe('getTsundereComment', () => {
  it('period フェーズでコメントを返す', () => {
    const phase = getCyclePhase('2025-02-12', '2025-02-10', 28, 5);
    expect(phase).not.toBeNull();
    const comment = getTsundereComment(phase!);
    expect(comment).toContain('生理');
    expect(comment).toContain('日目');
  });

  it('follicular フェーズでコメントを返す', () => {
    const phase = getCyclePhase('2025-02-18', '2025-02-10', 28, 5);
    expect(phase?.phase).toBe('follicular');
    const comment = getTsundereComment(phase!);
    expect(comment).toContain('卵胞期');
  });
});
