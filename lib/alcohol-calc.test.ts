import { describe, it, expect } from 'vitest';
import {
  calculateDecompositionTime,
  addHoursToTime,
  parseAlcoholTypeToAddedDrinks,
  DRINK_PRESETS,
} from './alcohol-calc';

describe('calculateDecompositionTime', () => {
  it('純アルコール20g・体重60kgで約3.3時間', () => {
    const hours = calculateDecompositionTime(20, 60);
    expect(hours).toBeCloseTo(3.33, 1);
  });

  it('純アルコール0で0時間', () => {
    expect(calculateDecompositionTime(0, 60)).toBe(0);
  });
});

describe('addHoursToTime', () => {
  it('19:00に2時間加算で21:00', () => {
    expect(addHoursToTime('19:00', 2)).toBe('21:00');
  });

  it('23:00に3時間加算で翌日になる', () => {
    const result = addHoursToTime('23:00', 3);
    expect(result).toContain('翌日');
    expect(result).toMatch(/02:00/);
  });
});

describe('parseAlcoholTypeToAddedDrinks', () => {
  it('空文字で空配列', () => {
    expect(parseAlcoholTypeToAddedDrinks('', 0)).toEqual([]);
  });

  it('ビールx2を正しくパース', () => {
    const result = parseAlcoholTypeToAddedDrinks('ビール (350ml)x2', 700);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].label).toBe('ビール (350ml)');
    expect(result[0].count).toBe(2);
  });
});

describe('DRINK_PRESETS', () => {
  it('主要プリセットが定義されている', () => {
    expect(DRINK_PRESETS.beer350.label).toBe('ビール (350ml)');
    expect(DRINK_PRESETS.sake.ml).toBe(180);
  });
});
