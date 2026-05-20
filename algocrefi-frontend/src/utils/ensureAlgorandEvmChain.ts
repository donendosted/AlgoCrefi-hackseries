import { ALGORAND_EVM_CHAIN_CONFIG } from "algo-x-evm-sdk";

type Eip1193RequestArgs = {
  method: string;
  params?: unknown[] | Record<string, unknown>;
};

type Eip1193Provider = {
  request: (args: Eip1193RequestArgs) => Promise<unknown>;
};

type EvmRpcError = {
  code?: number;
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

function normalizeChainId(chainId: unknown) {
  if (typeof chainId === "string") {
    if (chainId.startsWith("0x")) return chainId.toLowerCase();
    try {
      return `0x${BigInt(chainId).toString(16)}`;
    } catch {
      return chainId.toLowerCase();
    }
  }
  if (typeof chainId === "number" || typeof chainId === "bigint") {
    return `0x${BigInt(chainId).toString(16)}`;
  }
  return String(chainId).toLowerCase();
}

export async function ensureAlgorandEvmChain(provider?: Eip1193Provider | null) {
  const activeProvider = provider ?? (typeof window !== "undefined" ? window.ethereum : undefined);
  if (!activeProvider) return;

  const targetChainId = normalizeChainId(ALGORAND_EVM_CHAIN_CONFIG.chainId);
  const currentChainId = normalizeChainId(
    await activeProvider.request({ method: "eth_chainId" })
  );

  if (currentChainId === targetChainId) return;

  try {
    await activeProvider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetChainId }],
    });
    return;
  } catch (switchError: unknown) {
    if ((switchError as EvmRpcError)?.code !== 4902) {
      throw switchError;
    }
  }

  await activeProvider.request({
    method: "wallet_addEthereumChain",
    params: [ALGORAND_EVM_CHAIN_CONFIG],
  });

  await activeProvider.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: targetChainId }],
  });
}

