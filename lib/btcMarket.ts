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
 * Provider: Farside Investors (public) for BTC ETF flows.
 * They publish a CSV per ETF; we aggregate across a common set.
 * Note: This is a best-effort public source; format may change.
 */
export async function fetchBtcEtfNetFlowUsd(): Promise<BtcEtfFlow> {
  const csvUrls: string[] = [
    'https://farside.co.uk/bitcoin-etf-flow-all-data/',
  ];

  // Farside doesn't provide a stable JSON API; simplest approach is to parse the HTML table.
  // We implement a lightweight parser that looks for the latest "Total" row.
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(csvUrls[0], { signal: controller.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${csvUrls[0]}`);
    const html = await res.text();

    // Heuristic: find the first occurrence of 'Total' row and grab the last numeric cell.
    // We accept $ and commas and parentheses negatives.
    const totalRowMatch = html.match(/<tr[^>]*>\s*<t[hd][^>]*>\s*Total\s*<\/t[hd]>[\s\S]*?<\/tr>/i);
    if (!totalRowMatch) throw new Error('Unable to locate Total row for ETF flows');

    const row = totalRowMatch[0];

    // Extract all table cells values from the row.
    const cellValues = Array.from(row.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)).map((m) =>
      String(m[1])
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;|\s+/g, ' ')
        .trim()
    );

    // Find the last number-like cell.
    const numberLike = [...cellValues]
      .reverse()
      .find((v) => /[-(\d$][\d,.$() ]*/.test(v));

    if (!numberLike) throw new Error('Unable to parse ETF net flow number');

    // Normalize: ($1,234) => -1234 ; $1,234 => 1234. Assume USD millions? Farside uses $m.
    // Their table typically uses $m, so we convert to USD by * 1_000_000.
    const cleaned = numberLike.replace(/\$/g, '').replace(/,/g, '').trim();
    const negative = /^\(.*\)$/.test(cleaned);
    const numeric = Number(cleaned.replace(/[()]/g, ''));
    if (!Number.isFinite(numeric)) throw new Error('ETF net flow is not a number');
    const valueM = negative ? -numeric : numeric;

    return { netFlowUsd: valueM * 1_000_000 };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Provider: Coinglass (requires API key) for BTC futures Open Interest (USD).
 * Docs vary by plan; we call a common endpoint and parse best-effort.
 */
export async function fetchBtcOpenInterestUsd(): Promise<number> {
  const apiKey = process.env.COINGLASS_API_KEY;
  if (!apiKey) throw new Error('Missing environment variable: COINGLASS_API_KEY');

  const url = 'https://open-api.coinglass.com/public/v2/open_interest?symbol=BTC';
  const data = await fetchJson(url, {
    headers: {
      coinglassSecret: apiKey,
    },
  });

  const arr = readArray(data, 'data');
  if (!arr || arr.length === 0) throw new Error('Unexpected Coinglass response (no data)');

  const first = arr[0];
  const cand =
    readNumber(first, 'openInterestUsd') ??
    readNumber(first, 'openInterest') ??
    readNumber(first, 'sumOpenInterestUsd');

  if (!isFiniteNumber(cand)) throw new Error('Unexpected Coinglass response for open interest');
  return cand;
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
