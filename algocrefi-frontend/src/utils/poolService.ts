import { apiRequest } from "./apiClient";

export type Pool = {
  balance: number;
  totalShares: number;
  sharePrice: number;
};

export type PoolConfig = {
  appId: number;
  appAddress: string;
};

export type UserPool = {
  id: string;
  walletAddress: string;
  shares: number;
  optedIn?: boolean;
  algoValue: number;
};

export type PoolHistoryPoint = {
  time: number;
  value: number;
  poolBalanceMicro: number;
  totalShares: number;
  sharePriceMicroAlgo: number;
};

type PoolInfoResponse = {
  pool: Pool;
  config?: PoolConfig;
};

type UserPoolInfoResponse = {
  user: UserPool;
  config?: PoolConfig;
};

type PoolConfigResponse = {
  config: PoolConfig;
};

export async function getPoolInfo() {
  return apiRequest<PoolInfoResponse>("/api/pool/pool-info", { auth: false });
}

export async function getUserPoolInfo() {
  return apiRequest<UserPoolInfoResponse>("/api/pool/user-info");
}

export async function getPoolConfig() {
  const response = await apiRequest<PoolConfigResponse>("/api/pool/pool-info", { auth: false });
  return response.config;
}

export async function submitOptIn(signedOptInTx: string) {
  return apiRequest("/api/pool/opt-in", {
    method: "POST",
    body: { signedOptInTx },
  });
}

export async function submitDeposit(signedGroupTxs: string[]) {
  return apiRequest("/api/pool/deposit", {
    method: "POST",
    body: { signedGroupTxs },
  });
}

export async function submitWithdraw(shares: number, signedWithdrawTx: string) {
  return apiRequest("/api/pool/withdraw", {
    method: "POST",
    body: { shares, signedWithdrawTx },
  });
}

export async function getPoolHistory({
  appId,
  fromTs,
  toTs,
  limit = 12000,
}: {
  appId?: number;
  fromTs?: number;
  toTs?: number;
  limit?: number;
} = {}) {
  const now = Math.floor(Date.now() / 1000);
  const from = Number.isFinite(Number(fromTs)) ? Number(fromTs) : now - 7 * 24 * 3600;
  const to = Number.isFinite(Number(toTs)) ? Number(toTs) : now;
  const cappedLimit = Math.min(Math.max(Number(limit) || 12000, 1), 25000);
  const appIdParam = Number.isFinite(Number(appId)) ? `&appId=${Number(appId)}` : "";

  const response = await apiRequest<{ success: boolean; points?: PoolHistoryPoint[] }>(
    `/api/pool/pool-history?from=${from}&to=${to}&limit=${cappedLimit}${appIdParam}`,
    { auth: false }
  );

  if (!Array.isArray(response?.points)) return [];
  return response.points.filter(
    (p) =>
      Number.isFinite(Number(p.time)) &&
      Number.isFinite(Number(p.value)) &&
      Number(p.value) >= 0
  );
}

export function microAlgoToAlgo(n: number) {
  return Number((n / 1_000_000).toFixed(4));
}

export function algoToMicroAlgo(n: number) {
  return Math.floor(n * 1_000_000);
}

export function estimateShares(amountMicroAlgo: number, pool: Pool) {
  return Math.floor(amountMicroAlgo / pool.sharePrice);
}

export function estimateAlgoFromShares(shares: number, pool: Pool) {
  return (shares * pool.sharePrice) / 1_000_000;
}
