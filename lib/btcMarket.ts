export type BtcEtfFlow = {
  /** Net flow in USD for the day (inflow - outflow). Positive means net inflow. */
  netFlowUsd: number;
  /** Optional human-readable breakdown when provider exposes it. */
  inflowUsd?: number;
  outflowUsd?: number;
};

export type BtcSnapshot = {
  asOfIso: string;
  priceUsd?: number;
  etfFlow?: BtcEtfFlow;
  openInterestUsd?: number;
  /** Any provider errors (we keep sending even if something fails). */
  warnings: string[];
};

const DEFAULT_TIMEOUT_MS = 8_000;

type JsonObject = Record<string, unknown>;

function isObject(v: unknown): v is JsonObject {
  return typeof v === 'object' && v !== null;
}

function readNumber(obj: unknown, key: string): number | undefined {
  if (!isObject(obj)) return undefined;
  const v = obj[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function readObject(obj: unknown, key: string): JsonObject | undefined {
  if (!isObject(obj)) return undefined;
  const v = obj[key];
  return isObject(v) ? v : undefined;
}

function readArray(obj: unknown, key: string): unknown[] | undefined {
  if (!isObject(obj)) return undefined;
  const v = obj[key];
  return Array.isArray(v) ? v : undefined;
}

function toErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

async function fetchJson(url: string, init?: RequestInit & { timeoutMs?: number }) {
  const controller = new AbortController();
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'accept': 'application/json',
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} for ${url}${text ? `: ${text.slice(0, 200)}` : ''}`);
    }

    return (await res.json()) as unknown;
  } finally {
    clearTimeout(t);
  }
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Provider: CoinGecko (no key) spot BTC price.
 * Endpoint: https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd
 */
export async function fetchBtcPriceUsd(): Promise<number> {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';
  const data = await fetchJson(url);

  const bitcoin = readObject(data, 'bitcoin');
  const price = bitcoin ? readNumber(bitcoin, 'usd') : undefined;
  if (!isFiniteNumber(price)) throw new Error('Unexpected CoinGecko response for BTC price');
  return price;
}

/**
 * Provider: Twelve Data (requires API key) for BTC ETF flows.
 * We aggregate across a common set of US spot ETFs.
 */
export async function fetchBtcEtfNetFlowUsd(): Promise<BtcEtfFlow> {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) throw new Error('Missing environment variable: TWELVEDATA_API_KEY. Please add it to your environment.');

  // List of major US spot Bitcoin ETFs.
  const etfSymbols = ['IBIT', 'FBTC', 'BITB', 'ARKB', 'BTCO', 'EZBC', 'BRRR', 'HODL', 'GBTC'];

  // Try to get data for the last few days, starting from yesterday.
  for (let i = 1; i <= 5; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const results = await Promise.allSettled(
      etfSymbols.map(async (symbol) => {
        const url = `https://api.twelvedata.com/fund_flow?symbol=${symbol}&start_date=${dateStr}&end_date=${dateStr}&apikey=${apiKey}`;
        const data = await fetchJson(url);

        const fundFlows = readArray(data, 'fund_flows');
        if (fundFlows && fundFlows.length > 0) {
          const flowData = fundFlows[0];
          // Ensure the data is for the requested date.
          if (isObject(flowData) && flowData['date'] === dateStr) {
            const netFlow = readNumber(flowData, 'net_flow');
            if (isFiniteNumber(netFlow)) {
              return netFlow;
            }
          }
        }
        return null; // Represents no data for this ETF on this day.
      }),
    );

    const flows: number[] = [];
    let hasAnyData = false;
    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value !== null) {
          hasAnyData = true;
          flows.push(result.value);
        } else {
          // No data for this ETF, treat as zero flow.
          flows.push(0);
        }
      } else {
        // A fetch failed. We can either ignore this ETF or fail hard.
        // For robustness, let's log and treat as zero flow for this ETF for this day.
        console.warn(`Failed to fetch flow for an ETF on ${dateStr}:`, result.reason);
        flows.push(0);
      }
    }

    // If we found any data for any ETF on this date, we'll use it.
    if (hasAnyData) {
      const totalNetFlow = flows.reduce((sum, flow) => sum + flow, 0);
      return { netFlowUsd: totalNetFlow };
    }
    // If no data for any ETF on this date, continue to the previous day.
  }

  throw new Error('Unable to fetch BTC ETF net flow from Twelve Data for the last 5 days.');
}

/**
 * Provider: Twelve Data (requires API key) for BTC futures Open Interest (USD).
 * We make a best-effort attempt to parse the 'open_interest' technical indicator.
 */
export async function fetchBtcOpenInterestUsd(): Promise<number> {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) throw new Error('Missing environment variable: TWELVEDATA_API_KEY. Please add it to your environment.');

  const symbol = 'BTC/USD';
  const interval = '1day';
  const url = `https://api.twelvedata.com/open_interest?symbol=${symbol}&interval=${interval}&apikey=${apiKey}`;

  const data = await fetchJson(url);

  const values = readArray(data, 'values');
  if (!values || values.length === 0) throw new Error('Unexpected Twelve Data response for open interest (no values)');

  const mostRecent = values[0];
  const openInterestStr = isObject(mostRecent) ? (mostRecent['open_interest'] as string) : undefined;

  if (typeof openInterestStr !== 'string') {
    throw new Error('Unexpected Twelve Data response for open interest (invalid format)');
  }

  const openInterest = Number(openInterestStr);

  if (!isFiniteNumber(openInterest)) throw new Error('Unexpected Twelve Data response for open interest (not a number)');

  // We are assuming the open interest value from this endpoint is in USD.
  return openInterest;
}

let cache:
  | {
      atMs: number;
      value: BtcSnapshot;
    }
  | undefined;

/**
 * Returns a best-effort snapshot with warnings; never throws.
 * In-memory cache (per lambda instance) with TTL to reduce API hits.
 */
export async function getBtcSnapshot(opts?: { ttlMs?: number }): Promise<BtcSnapshot> {
  const ttlMs = opts?.ttlMs ?? 5 * 60_000;
  const now = Date.now();
  if (cache && now - cache.atMs < ttlMs) return cache.value;

  const warnings: string[] = [];

  const asOfIso = new Date().toISOString();

  const [priceRes, etfRes, oiRes] = await Promise.allSettled([
    fetchBtcPriceUsd(),
    fetchBtcEtfNetFlowUsd(),
    fetchBtcOpenInterestUsd(),
  ]);

  const snapshot: BtcSnapshot = { asOfIso, warnings };

  if (priceRes.status === 'fulfilled') snapshot.priceUsd = priceRes.value;
  else warnings.push(`BTC price unavailable: ${toErrorMessage(priceRes.reason)}`);

  if (etfRes.status === 'fulfilled') snapshot.etfFlow = etfRes.value;
  else warnings.push(`BTC ETF flow unavailable: ${toErrorMessage(etfRes.reason)}`);

  if (oiRes.status === 'fulfilled') snapshot.openInterestUsd = oiRes.value;
  else warnings.push(`BTC open interest unavailable: ${toErrorMessage(oiRes.reason)}`);

  cache = { atMs: now, value: snapshot };
  return snapshot;
}

export function formatUsd(n: number, opts?: { compact?: boolean }) {
  const compact = opts?.compact ?? true;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
    notation: compact ? 'compact' : 'standard',
  }).format(n);
}

export function formatSignedUsd(n: number, opts?: { compact?: boolean }) {
  const s = formatUsd(Math.abs(n), opts);
  return n >= 0 ? `+${s}` : `-${s}`;
}

export function buildDailyMailText(baseText: string, snapshot: BtcSnapshot) {
  const lines: string[] = [];
  if (baseText.trim()) lines.push(baseText.trim(), '');

  lines.push('=== BTC Daily Snapshot (best-effort) ===');
  lines.push(`As of: ${snapshot.asOfIso}`);

  if (typeof snapshot.priceUsd === 'number') lines.push(`BTC Price: ${formatUsd(snapshot.priceUsd, { compact: false })}`);
  else lines.push('BTC Price: N/A');

  if (snapshot.etfFlow) lines.push(`BTC ETF Net Flow: ${formatSignedUsd(snapshot.etfFlow.netFlowUsd)}`);
  else lines.push('BTC ETF Net Flow: N/A');

  if (typeof snapshot.openInterestUsd === 'number') lines.push(`BTC Open Interest (USD): ${formatUsd(snapshot.openInterestUsd)}`);
  else lines.push('BTC Open Interest (USD): N/A');

  if (snapshot.warnings.length) {
    lines.push('', 'Warnings:');
    for (const w of snapshot.warnings) lines.push(`- ${w}`);
  }

  return lines.join('\n');
}
