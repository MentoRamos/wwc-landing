import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime } from '@/lib/core/format.core';

/**
 * Every date the platform shows belongs to a person living in Brazil, and the
 * server rendering it does not: Vercel runs UTC.
 *
 * So a subscription expiring at 02:00 UTC was being printed as the 11th to
 * somebody who, in São Paulo, was still on the 10th. Nobody would report that
 * as a bug — they would just believe the wrong date, right up until the day
 * their access ended when they thought they had one more.
 */
describe('formatDate', () => {
  it('shows the day it is in São Paulo, not the day it is in UTC', () => {
    // 02:00 UTC on the 11th is 23:00 on the 10th in São Paulo.
    expect(formatDate('2026-09-11T02:00:00Z')).toBe('10/09/2026');
  });

  it('agrees with UTC when the hour is not near the boundary', () => {
    expect(formatDate('2026-09-11T15:00:00Z')).toBe('11/09/2026');
  });

  it('handles the other edge, just before midnight in São Paulo', () => {
    // 02:59 UTC on the 12th is still 23:59 on the 11th there.
    expect(formatDate('2026-09-12T02:59:00Z')).toBe('11/09/2026');
    expect(formatDate('2026-09-12T03:00:00Z')).toBe('12/09/2026');
  });

  it('takes a Date as readily as a string', () => {
    expect(formatDate(new Date('2026-09-11T02:00:00Z'))).toBe('10/09/2026');
  });

  it('says nothing for nothing, rather than "Invalid Date"', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('')).toBe('');
    expect(formatDate('nem data isso é')).toBe('');
  });
});

describe('formatDateTime', () => {
  it('writes the weekday, the day and the hour in São Paulo', () => {
    // Thursday 2026-09-17 at 23:00 UTC is Thursday 20:00 there.
    const written = formatDateTime('2026-09-17T23:00:00Z');
    expect(written).toMatch(/quinta/i);
    expect(written).toContain('17');
    expect(written).toContain('20:00');
  });

  it('says nothing for nothing', () => {
    expect(formatDateTime(null)).toBe('');
    expect(formatDateTime('não é data')).toBe('');
  });
});
