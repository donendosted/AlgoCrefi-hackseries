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
