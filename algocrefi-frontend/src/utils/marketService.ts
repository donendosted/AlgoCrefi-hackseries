import { ApiError, apiRequest } from "./apiClient";

export type OHLCCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type MarketStats = {
  price: number;
  change24h: number;
  volume24h: number;
  liquidity: number;
  high24h: number;
  low24h: number;
};

export type PoolSnapshot = {
  poolAddress: string;
  algoReserve: number;
  quoteReserve: number;
  quoteAssetId: number;
  quoteSymbol: string;
  usdcPerAlgo: number;
  round: number;
};

const INTERVAL_SECONDS: Record<string, number> = {
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
};

export async function fetchOHLC(interval: string, pair = "ALGO_USDC") {
  const now = Math.floor(Date.now() / 1000);
  const seconds = INTERVAL_SECONDS[interval] ?? 3600;
  const candleCount = 60;
  const fromTs = now - candleCount * seconds;

  let response: { candles?: OHLCCandle[] };
  try {
    response = await apiRequest<{ candles?: OHLCCandle[] }>(
      `/api/market/ohlc?pair=${encodeURIComponent(pair)}&interval=${encodeURIComponent(interval)}&from=${fromTs}&to=${now}`,
      { auth: false }
    );
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) {
      throw new Error("Market OHLC endpoint is not available on backend yet");
    }
    throw error;
  }

  if (!Array.isArray(response.candles) || response.candles.length === 0) {
    throw new Error("No market candles available");
  }

  return response.candles;
}

export async function fetchMarketStats(pair = "ALGO_USDC"): Promise<MarketStats> {
  let response: MarketStats;
  try {
    response = await apiRequest<MarketStats>(`/api/market/stats?pair=${encodeURIComponent(pair)}`, {
      auth: false,
    });
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) {
      throw new Error("Market stats endpoint is not available on backend yet");
    }
    throw error;
  }

  if (typeof response?.price !== "number") {
    throw new Error("Market stats unavailable");
  }

  return response;
}

export async function fetchPoolSnapshot(): Promise<PoolSnapshot> {
  const response = await apiRequest<PoolSnapshot>("/api/market/pool-snapshot", {
    auth: false,
  });

  if (typeof response?.usdcPerAlgo !== "number") {
    throw new Error("Pool snapshot unavailable");
  }

  return response;
}
