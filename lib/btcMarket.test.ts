import { buildDailyMailText, formatSignedUsd, formatUsd } from './btcMarket';

describe('btcMarket formatting', () => {
  test('formatUsd produces a USD currency string', () => {
    expect(formatUsd(1234, { compact: false })).toContain('$');
  });

  test('formatSignedUsd prefixes sign', () => {
    expect(formatSignedUsd(10)).toMatch(/^\+/);
    expect(formatSignedUsd(-10)).toMatch(/^-/);
  });

  test('buildDailyMailText includes snapshot fields and warnings', () => {
    const text = buildDailyMailText('Base', {
      asOfIso: '2026-01-18T00:00:00.000Z',
      priceUsd: 42000,
      etfFlow: { netFlowUsd: -12_000_000 },
      openInterestUsd: 10_000_000_000,
      warnings: ['x'],
    });

    expect(text).toContain('Base');
    expect(text).toContain('BTC Price');
    expect(text).toContain('BTC ETF Net Flow');
    expect(text).toContain('BTC Open Interest');
    expect(text).toContain('Warnings:');
  });
});

