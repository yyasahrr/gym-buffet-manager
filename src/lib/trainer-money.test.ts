import { describe, expect, it } from 'vitest';
import { expandMonthlyBookings, splitTrainerPayment } from './trainer';

describe('trainer accounting', () => {
  it('splits gross amount after tax', () => {
    expect(splitTrainerPayment(1000000, 20, 10)).toEqual({ gross: 1000000, tax: 100000, gym: 180000, trainer: 720000, net: 900000 });
  });
  it('expands recurring weekly sessions and skips holidays', () => {
    const rows = expandMonthlyBookings('2026-07-01', 2026, 6, 3, '18:00', ['2026-07-15']);
    expect(rows.every(x => x.time === '18:00')).toBe(true);
    expect(rows.some(x => x.date === '2026-07-15')).toBe(false);
  });
});
