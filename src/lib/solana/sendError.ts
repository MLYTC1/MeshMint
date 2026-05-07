import {
  isSolanaError,
  SOLANA_ERROR__INSTRUCTION_PLANS__FAILED_TO_EXECUTE_TRANSACTION_PLAN,
} from "@solana/kit";

/** Walk a `transactionPlanResult` tree and return the first failed step's error. */
function extractFailedPlanError(plan: unknown): unknown {
  if (!plan || typeof plan !== "object") return undefined;
  const o = plan as Record<string, unknown>;

  if (o.kind === "single") {
    const status = o.status as Record<string, unknown> | undefined;
    if (status?.kind === "failed") return status.error;
    return undefined;
  }

  if (
    (o.kind === "sequential" || o.kind === "parallel") &&
    Array.isArray(o.plans)
  ) {
    for (const sub of o.plans) {
      const err = extractFailedPlanError(sub);
      if (err !== undefined) return err;
    }
  }

  return undefined;
}

function errorToBriefString(error: unknown): string {
  if (error == null) return "Unknown error";
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    if (typeof (error as { cause?: unknown }).cause !== "undefined") {
      const c = (error as { cause?: unknown }).cause;
      if (c !== error) {
        const inner = errorToBriefString(c);
        if (inner && inner !== error.message) {
          return `${error.message}: ${inner}`;
        }
      }
    }
    return error.message;
  }
  if (typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Turns `useSendTransaction().send()` failures into something we can show in a
 * toast. Unwraps `SOLANA_ERROR__INSTRUCTION_PLANS__FAILED_TO_EXECUTE_TRANSACTION_PLAN`
 * and reads the nested RPC / simulation error from `transactionPlanResult`.
 */
export function formatSendTransactionError(error: unknown): string {
  if (
    isSolanaError(
      error,
      SOLANA_ERROR__INSTRUCTION_PLANS__FAILED_TO_EXECUTE_TRANSACTION_PLAN,
    )
  ) {
    const nested = extractFailedPlanError(error.context.transactionPlanResult);
    if (nested !== undefined) {
      const text = errorToBriefString(nested);
      return text.length > 500 ? `${text.slice(0, 500)}…` : text;
    }
    const viaCause =
      typeof (error as Error & { cause?: unknown }).cause !== "undefined"
        ? errorToBriefString((error as Error & { cause?: unknown }).cause)
        : "";
    return viaCause || error.message;
  }

  return errorToBriefString(error);
}
