import algosdk, { type Transaction } from "algosdk";
import { Buffer } from "buffer";

type WalletType = "pera" | "lute";

const WALLET_TYPE_KEY = "algocrefi_wallet_type";
const TESTNET_GENESIS_ID = "testnet-v1.0";
const isBrowser = typeof window !== "undefined";

export let peraWallet: {
  connect: () => Promise<string[]>;
  reconnectSession: () => Promise<string[]>;
  disconnect: () => Promise<void>;
  signTransaction: (txns: Array<Array<{ txn: Transaction; signers: string[] }>>) => Promise<Uint8Array[]>;
  connector?: { on?: (event: string, cb: () => void) => void } | null;
} | null = null;

export let luteWallet: {
  connect: (genesisId: string) => Promise<string[]>;
  disconnect?: () => Promise<void>;
  signTxns: (txns: Array<{ txn: string }>) => Promise<Array<Uint8Array | null>>;
} | null = null;

async function getPeraWallet() {
  if (!isBrowser) throw new Error("Wallet clients are only available in browser context");
  if (!peraWallet) {
    const mod = await import("@perawallet/connect");
    peraWallet = new mod.PeraWalletConnect({ network: "testnet" } as any);
  }
  return peraWallet;
}

async function getLuteWallet() {
  if (!isBrowser) throw new Error("Wallet clients are only available in browser context");
  if (!luteWallet) {
    const mod = await import("lute-connect");
    luteWallet = new mod.default("AlgoCrefi") as unknown as NonNullable<typeof luteWallet>;
  }
  return luteWallet;
}

export async function connectPera() {
  const wallet = await getPeraWallet();
  const accounts = await wallet.connect();
  if (typeof window !== "undefined") {
    localStorage.setItem(WALLET_TYPE_KEY, "pera");
  }
  return accounts;
}

export async function connectLute() {
  const wallet = await getLuteWallet();
  const accounts = await wallet.connect(TESTNET_GENESIS_ID);
  if (typeof window !== "undefined") {
    localStorage.setItem(WALLET_TYPE_KEY, "lute");
  }
  return accounts;
}

export async function reconnectPera() {
  const wallet = await getPeraWallet();
  return wallet.reconnectSession();
}

export async function disconnectWallet(type: WalletType) {
  if (type === "pera") {
    const wallet = await getPeraWallet();
    await wallet.disconnect();
  } else {
    const wallet = await getLuteWallet();
    await wallet.disconnect?.();
  }

  if (typeof window !== "undefined") {
    localStorage.removeItem(WALLET_TYPE_KEY);
  }
}

export async function signTransactions(txns: Transaction[], walletType: WalletType) {
  if (!txns.length) return [];

  if (walletType === "pera") {
    const wallet = await getPeraWallet();
    const signerGroup = txns.map((txn) => ({
      txn,
      signers: [algosdk.encodeAddress(txn.sender.publicKey)],
    }));
    return wallet.signTransaction([signerGroup]);
  }

  const wallet = await getLuteWallet();
  const signed = await wallet.signTxns(
    txns.map((txn) => ({ txn: Buffer.from(txn.toByte()).toString("base64") }))
  );

  const filtered = signed.filter((item): item is Uint8Array => item instanceof Uint8Array);
  if (filtered.length !== txns.length) {
    throw new Error("Wallet did not sign all transactions");
  }

  return filtered;
}

export async function bindPeraDisconnect(handler: () => void) {
  const wallet = await getPeraWallet();
  wallet.connector?.on?.("disconnect", handler);
}

export function truncateAddress(addr: string) {
  if (!addr) return "";
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function getStoredWalletType(): WalletType | null {
  if (typeof window === "undefined") return null;
  const type = localStorage.getItem(WALLET_TYPE_KEY);
  if (type === "pera" || type === "lute") return type;
  return null;
}
