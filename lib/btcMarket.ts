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
  etfBasicInfo?: BtcEtfBasicInfo;
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
  // The Twelve Data /fund_flow endpoint appears to be deprecated as it returns a 404.
  // A replacement data source is needed to restore this functionality.
  throw new Error('BTC ETF flow unavailable: The Twelve Data API endpoint (/fund_flow) is no longer working.');
}

/**
 * Provider: Twelve Data (requires API key) for BTC futures Open Interest (USD).
 * We make a best-effort attempt to parse the 'open_interest' technical indicator.
 */
export async function fetchBtcOpenInterestUsd(): Promise<number> {
  // The Twelve Data /open_interest endpoint appears to be deprecated as it returns a 404.
  // A replacement data source is needed to restore this functionality.
  throw new Error('BTC open interest unavailable: The Twelve Data API endpoint (/open_interest) is no longer working.');
}

export type BtcEtfBasicInfo = {
  name: string;
  assetClass: string;
  expenseRatio?: number;
  marketCap?: number;
  inceptionDate?: string;
};

export async function fetchBtcEtfBasicInfo(): Promise<BtcEtfBasicInfo> {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) throw new Error('Missing environment variable: TWELVEDATA_API_KEY. Please add it to your environment.');

  const symbol = 'IBIT'; // Picking one major BTC ETF for basic info
  const url = `https://api.twelvedata.com/etf?symbol=${symbol}&apikey=${apiKey}`;

  const data = await fetchJson(url);

  if (!isObject(data)) throw new Error('Unexpected Twelve Data response for ETF basic info');

  const name = typeof data.name === 'string' ? data.name : undefined;
  const assetClass = typeof data.asset_class === 'string' ? data.asset_class : undefined;
  const expenseRatio = readNumber(data, 'expense_ratio');
  const marketCap = readNumber(data, 'market_cap');
  const inceptionDate = typeof data.inception_date === 'string' ? data.inception_date : undefined;

  if (!name || !assetClass) throw new Error('Missing critical fields in ETF basic info response');

  return { name, assetClass, expenseRatio, marketCap, inceptionDate };
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

  const [priceRes, etfRes, oiRes, etfBasicInfoRes] = await Promise.allSettled([
    fetchBtcPriceUsd(),
    fetchBtcEtfNetFlowUsd(),
    fetchBtcOpenInterestUsd(),
    fetchBtcEtfBasicInfo(),
  ]);

  const snapshot: BtcSnapshot = { asOfIso, warnings };

  if (priceRes.status === 'fulfilled') snapshot.priceUsd = priceRes.value;
  else warnings.push(`BTC price unavailable: ${toErrorMessage(priceRes.reason)}`);

  if (etfRes.status === 'fulfilled') snapshot.etfFlow = etfRes.value;
  else warnings.push(`BTC ETF flow unavailable: ${toErrorMessage(etfRes.reason)}`);

  if (oiRes.status === 'fulfilled') snapshot.openInterestUsd = oiRes.value;
  else warnings.push(`BTC open interest unavailable: ${toErrorMessage(oiRes.reason)}`);

  if (etfBasicInfoRes.status === 'fulfilled') snapshot.etfBasicInfo = etfBasicInfoRes.value;
  else warnings.push(`BTC ETF basic info unavailable: ${toErrorMessage(etfBasicInfoRes.reason)}`);

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

  if (snapshot.etfBasicInfo) {
    lines.push('');
    lines.push('=== BTC ETF Basic Info (IBIT) ===');
    lines.push(`Name: ${snapshot.etfBasicInfo.name}`);
    lines.push(`Asset Class: ${snapshot.etfBasicInfo.assetClass}`);
    if (typeof snapshot.etfBasicInfo.expenseRatio === 'number') {
      lines.push(`Expense Ratio: ${snapshot.etfBasicInfo.expenseRatio}%`);
    }
    if (typeof snapshot.etfBasicInfo.marketCap === 'number') {
      lines.push(`Market Cap: ${formatUsd(snapshot.etfBasicInfo.marketCap, { compact: true })}`);
    }
    if (snapshot.etfBasicInfo.inceptionDate) {
      lines.push(`Inception Date: ${snapshot.etfBasicInfo.inceptionDate}`);
    }
  } else {
    lines.push('', 'BTC ETF Basic Info: N/A');
  }

  if (snapshot.warnings.length) {
    lines.push('', 'Warnings:');
    for (const w of snapshot.warnings) lines.push(`- ${w}`);
  }

  return lines.join('\n');
}
