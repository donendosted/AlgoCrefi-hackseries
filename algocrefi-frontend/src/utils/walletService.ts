import type { Transaction } from "algosdk";
import { walletManager } from "@/src/utils/xchainConfig";

export async function disconnectWallet() {
  await walletManager.disconnect();
}

export async function signTransactions(txns: Transaction[]) {
  if (!txns.length) return [];
  if (!walletManager.activeAddress) {
    throw new Error("Connect your wallet first");
  }

  const signed = await walletManager.signTransactions(txns);
  const filtered = signed.filter((item): item is Uint8Array => item instanceof Uint8Array);
  if (filtered.length !== txns.length) {
    throw new Error("Wallet did not sign all transactions");
  }
  return filtered;
}

export function truncateAddress(addr: string) {
  if (!addr) return "";
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function getStoredWalletType() {
  return walletManager.activeWallet?.id ?? null;
}
