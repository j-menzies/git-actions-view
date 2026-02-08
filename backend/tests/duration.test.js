const { formatDuration } = require('../src/utils/duration');

describe('formatDuration', () => {
  test('returns null if startIso missing', () => {
    expect(formatDuration(null, '2026-01-01T00:05:00Z')).toBeNull();
  });

  test('returns null if endIso missing', () => {
    expect(formatDuration('2026-01-01T00:00:00Z', null)).toBeNull();
  });

  test('returns null if both missing', () => {
    expect(formatDuration(null, null)).toBeNull();
    expect(formatDuration(undefined, undefined)).toBeNull();
  });

  test('returns null if end before start', () => {
    expect(formatDuration('2026-01-01T00:05:00Z', '2026-01-01T00:00:00Z')).toBeNull();
  });

  test('formats seconds only', () => {
    expect(formatDuration('2026-01-01T00:00:00Z', '2026-01-01T00:00:45Z')).toBe('45s');
  });

  test('formats zero duration', () => {
    expect(formatDuration('2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')).toBe('0s');
  });

  test('formats minutes and seconds', () => {
    expect(formatDuration('2026-01-01T00:00:00Z', '2026-01-01T00:05:12Z')).toBe('5m 12s');
  });

  test('formats hours minutes and seconds', () => {
    expect(formatDuration('2026-01-01T00:00:00Z', '2026-01-01T01:30:45Z')).toBe('1h 30m 45s');
  });

  test('formats large hours', () => {
    expect(formatDuration('2026-01-01T00:00:00Z', '2026-01-02T02:00:00Z')).toBe('26h 0m 0s');
  });

  test('handles ISO timestamps with milliseconds', () => {
    const result = formatDuration('2026-01-01T00:00:00.000Z', '2026-01-01T00:02:30.500Z');
    expect(result).toBe('2m 30s');
  });
});
