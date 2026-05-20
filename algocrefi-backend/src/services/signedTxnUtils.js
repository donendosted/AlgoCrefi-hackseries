const algosdk = require("algosdk");

function normalizeSignedTxnInput(input, fieldName = "signed transaction") {
  if (input instanceof Uint8Array) {
    return Uint8Array.from(input);
  }

  if (Buffer.isBuffer(input)) {
    return Uint8Array.from(input);
  }

  if (typeof input === "string") {
    const value = input.trim();
    if (!value) {
      throw new Error(`Invalid ${fieldName}: empty string`);
    }

    if (value.startsWith("0x")) {
      const hex = value.slice(2);
      return Uint8Array.from(Buffer.from(hex, "hex"));
    }

    return Uint8Array.from(Buffer.from(value, "base64"));
  }

  if (Array.isArray(input) && input.every((item) => Number.isInteger(item) && item >= 0 && item <= 255)) {
    return Uint8Array.from(input);
  }

  if (input && typeof input === "object") {
    if (input.type === "Buffer" && Array.isArray(input.data)) {
      return Uint8Array.from(input.data);
    }

    const candidateKeys = ["blob", "stxn", "signedTxn", "signedTx", "tx"];
    for (const key of candidateKeys) {
      if (key in input) {
        return normalizeSignedTxnInput(input[key], fieldName);
      }
    }
  }

  throw new Error(`Invalid ${fieldName}: unsupported payload type`);
}

function decodeTxnFromSignedBytes(raw) {
  const signedMap = algosdk.msgpackRawDecodeAsMap(raw);
  if (!(signedMap instanceof Map)) {
    throw new Error("decoded payload is not a msgpack map");
  }

  const txnMap = signedMap.get("txn");
  if (!(txnMap instanceof Map)) {
    throw new Error("missing txn map");
  }

  const unsignedBytes = algosdk.msgpackRawEncode(txnMap);
  return algosdk.decodeUnsignedTransaction(unsignedBytes);
}

function decodeSignedTxnSafe(input, fieldName = "signed transaction") {
  const raw = normalizeSignedTxnInput(input, fieldName);

  try {
    const decoded = algosdk.decodeSignedTransaction(raw);
    return {
      raw,
      txn: decoded?.txn || null,
      decoded,
      decodeError: null,
    };
  } catch (decodeErr) {
    try {
      const txn = decodeTxnFromSignedBytes(raw);
      return {
        raw,
        txn,
        decoded: null,
        decodeError: decodeErr,
      };
    } catch (fallbackErr) {
      const decodeMsg = decodeErr instanceof Error ? decodeErr.message : String(decodeErr || "");
      const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr || "");
      throw new Error(
        `Invalid ${fieldName}: cannot decode signed payload (${decodeMsg}; fallback: ${fallbackMsg})`
      );
    }
  }
}

module.exports = {
  decodeSignedTxnSafe,
};

