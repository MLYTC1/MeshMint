/** Lamports per SOL (matches on-chain u64 price unit). */
export const LAMPORTS_PER_SOL = 1_000_000_000n;

const SOL_DECIMALS = 9;

/**
 * Normalizes the price field before lamport conversion. Handles scientific
 * notation from `type="number"` (e.g. `1e-8`) and trims thousands separators.
 */
export function normalizeListingPriceInput(raw: string): string {
  let t = raw.trim().replace(/,/g, "");
  if (!t || t === ".") return "";
  if (/^-/u.test(t)) return "";

  if (/e/i.test(t)) {
    const n = Number.parseFloat(t.replace(/,/g, ""));
    if (!Number.isFinite(n) || n <= 0) return "";
    return n.toLocaleString("fullwide", {
      maximumFractionDigits: 20,
      useGrouping: false,
    });
  }

  return t.startsWith(".") ? `0${t}` : t;
}

/**
 * Parse a user-entered SOL amount (decimal string) into lamports using only
 * integer math — avoids float underflow where `sol > 0` but `sol * 1e9 === 0`.
 */
export function decimalSolStringToLamports(solInput: string): bigint {
  let t = solInput.trim().replace(/,/g, "");
  if (t === "" || t === ".") return 0n;
  if (t.startsWith(".")) t = `0${t}`;
  if (t.startsWith("-")) return 0n;

  const [wholeRaw, fracRaw = ""] = t.split(".");
  if (!/^\d*$/.test(wholeRaw ?? "") || !/^\d*$/.test(fracRaw)) {
    return 0n;
  }
  const whole = wholeRaw === "" ? "0" : wholeRaw!;
  const fracPadded = `${fracRaw}${"0".repeat(SOL_DECIMALS)}`.slice(
    0,
    SOL_DECIMALS,
  );
  try {
    return BigInt(whole) * LAMPORTS_PER_SOL + BigInt(fracPadded || "0");
  } catch {
    return 0n;
  }
}

/**
 * USDC notional (string, up to 6 fractional digits) → lamports at
 * `usdPerSol` USDC per SOL, rounded up so the on-chain price is never 0 when
 * USDC &gt; 0.
 */
export function usdcStringToLamports(
  usdcInput: string,
  usdPerSol: bigint = 130n,
): bigint {
  let t = usdcInput.trim().replace(/,/g, "");
  if (t === "" || t === ".") return 0n;
  if (t.startsWith(".")) t = `0${t}`;
  if (t.startsWith("-")) return 0n;

  const [wholeRaw, fracRaw = ""] = t.split(".");
  if (!/^\d*$/.test(wholeRaw ?? "") || !/^\d*$/.test(fracRaw)) {
    return 0n;
  }
  const whole = wholeRaw === "" ? "0" : wholeRaw!;
  const frac6 = `${fracRaw}000000`.slice(0, 6);
  try {
    const microUsdc = BigInt(whole) * 1_000_000n + BigInt(frac6 || "0");
    if (microUsdc <= 0n) return 0n;
    const num = microUsdc * LAMPORTS_PER_SOL;
    const den = usdPerSol * 1_000_000n;
    if (den <= 0n) return 0n;
    let q = num / den;
    if (num % den > 0n) q += 1n;
    return q < 1n ? 1n : q;
  } catch {
    return 0n;
  }
}
