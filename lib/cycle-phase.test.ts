import { describe, it, expect } from 'vitest';
import { getCyclePhase, getCycleComment } from './cycle-phase';

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

describe('getCycleComment', () => {
  it('tsundere: period フェーズでコメントを返す', () => {
    const phase = getCyclePhase('2025-02-12', '2025-02-10', 28, 5);
    expect(phase).not.toBeNull();
    const comment = getCycleComment(phase!, 'tsundere');
    expect(comment).toContain('生理');
    expect(comment).toContain('日目');
  });

  it('tsundere: follicular フェーズでコメントを返す', () => {
    const phase = getCyclePhase('2025-02-18', '2025-02-10', 28, 5);
    expect(phase?.phase).toBe('follicular');
    const comment = getCycleComment(phase!, 'tsundere');
    expect(comment).toContain('卵胞期');
  });

  it('amayama: period フェーズでコメントを返す', () => {
    const phase = getCyclePhase('2025-02-12', '2025-02-10', 28, 5);
    expect(phase).not.toBeNull();
    const comment = getCycleComment(phase!, 'amayama');
    expect(comment).toContain('生理');
    expect(comment).toContain('日目');
  });

  it('kibishime: pms フェーズでコメントを返す', () => {
    const phase = getCyclePhase('2025-03-05', '2025-02-10', 28, 5);
    expect(phase?.phase).toBe('pms');
    const comment = getCycleComment(phase!, 'kibishime');
    expect(comment).toContain('PMS');
  });

  it('naruse: pms フェーズでコメントを返す', () => {
    const phase = getCyclePhase('2025-03-05', '2025-02-10', 28, 5);
    const comment = getCycleComment(phase!, 'naruse');
    expect(comment).toContain('PMS');
  });

  it('不正な personality は tsundere にフォールバックする', () => {
    const phase = getCyclePhase('2025-02-12', '2025-02-10', 28, 5);
    const comment = getCycleComment(phase!, 'unknown_personality');
    expect(comment).toContain('生理');
  });
});
