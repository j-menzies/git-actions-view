const { formatDuration, detectRunnerOs, calculateBillableMinutes } = require('../src/utils/duration');

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

describe('detectRunnerOs', () => {
  test('detects linux from ubuntu-latest', () => {
    expect(detectRunnerOs(['ubuntu-latest'])).toBe('linux');
  });

  test('detects linux from ubuntu-22.04', () => {
    expect(detectRunnerOs(['ubuntu-22.04'])).toBe('linux');
  });

  test('detects macos from macos-latest', () => {
    expect(detectRunnerOs(['macos-latest'])).toBe('macos');
  });

  test('detects macos from macos-14', () => {
    expect(detectRunnerOs(['macos-14'])).toBe('macos');
  });

  test('detects windows from windows-latest', () => {
    expect(detectRunnerOs(['windows-latest'])).toBe('windows');
  });

  test('detects windows from windows-2022', () => {
    expect(detectRunnerOs(['windows-2022'])).toBe('windows');
  });

  test('detects self-hosted', () => {
    expect(detectRunnerOs(['self-hosted', 'linux'])).toBe('self-hosted');
  });

  test('self-hosted takes precedence over OS labels', () => {
    expect(detectRunnerOs(['self-hosted', 'macos-latest'])).toBe('self-hosted');
  });

  test('defaults to linux for unknown labels', () => {
    expect(detectRunnerOs(['custom-runner'])).toBe('linux');
  });

  test('defaults to linux for empty labels', () => {
    expect(detectRunnerOs([])).toBe('linux');
  });

  test('defaults to linux for null/undefined', () => {
    expect(detectRunnerOs(null)).toBe('linux');
    expect(detectRunnerOs(undefined)).toBe('linux');
  });
});

describe('calculateBillableMinutes', () => {
  test('returns null if start missing', () => {
    expect(calculateBillableMinutes(null, '2026-01-01T00:05:00Z', '[]')).toBeNull();
  });

  test('returns null if end missing', () => {
    expect(calculateBillableMinutes('2026-01-01T00:00:00Z', null, '[]')).toBeNull();
  });

  test('returns null if end before start', () => {
    expect(calculateBillableMinutes('2026-01-01T00:05:00Z', '2026-01-01T00:00:00Z', '[]')).toBeNull();
  });

  test('rounds up to nearest minute for Linux (1x)', () => {
    const result = calculateBillableMinutes(
      '2026-01-01T00:00:00Z', '2026-01-01T00:00:35Z', '["ubuntu-latest"]'
    );
    expect(result.minutes).toBe(1); // 35s rounds to 1 minute * 1x
    expect(result.os).toBe('linux');
  });

  test('exact minute boundary for Linux', () => {
    const result = calculateBillableMinutes(
      '2026-01-01T00:00:00Z', '2026-01-01T00:02:00Z', '["ubuntu-latest"]'
    );
    expect(result.minutes).toBe(2);
    expect(result.os).toBe('linux');
  });

  test('applies Windows 2x multiplier', () => {
    const result = calculateBillableMinutes(
      '2026-01-01T00:00:00Z', '2026-01-01T00:02:00Z', '["windows-latest"]'
    );
    expect(result.minutes).toBe(4); // 2 minutes * 2x
    expect(result.os).toBe('windows');
  });

  test('applies macOS 10x multiplier', () => {
    const result = calculateBillableMinutes(
      '2026-01-01T00:00:00Z', '2026-01-01T00:01:30Z', '["macos-latest"]'
    );
    expect(result.minutes).toBe(20); // 1m30s rounds to 2 min * 10x
    expect(result.os).toBe('macos');
  });

  test('returns 0 minutes for self-hosted', () => {
    const result = calculateBillableMinutes(
      '2026-01-01T00:00:00Z', '2026-01-01T00:05:00Z', '["self-hosted","linux"]'
    );
    expect(result.minutes).toBe(0);
    expect(result.os).toBe('self-hosted');
  });

  test('handles zero duration', () => {
    const result = calculateBillableMinutes(
      '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', '["ubuntu-latest"]'
    );
    expect(result.minutes).toBe(0);
    expect(result.os).toBe('linux');
  });

  test('handles null labels JSON (defaults to linux)', () => {
    const result = calculateBillableMinutes(
      '2026-01-01T00:00:00Z', '2026-01-01T00:01:00Z', null
    );
    expect(result.minutes).toBe(1);
    expect(result.os).toBe('linux');
  });
});
