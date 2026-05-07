export function safeArray<T>(value: unknown, name: string): T[] {
  if (!Array.isArray(value)) {
    console.warn(`Invalid array for ${name}, defaulting to []`, value);
    return [];
  }
  return value as T[];
}

export function requireArray<T>(value: unknown, name: string): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array`);
  }
  return value as T[];
}

export function safeLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

type JsonRecord = Record<string, unknown>;

export function safeJsonSnapshot(value: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(
      value,
      (_key, current) => {
        if (typeof current === "bigint") return current.toString();
        if (
          current &&
          typeof current === "object" &&
          "toBase58" in (current as JsonRecord) &&
          typeof (current as { toBase58?: unknown }).toBase58 === "function"
        ) {
          return (current as { toBase58: () => string }).toBase58();
        }
        if (current instanceof Error) {
          return {
            name: current.name,
            message: current.message,
            stack: current.stack,
          };
        }
        if (current && typeof current === "object") {
          if (seen.has(current)) return "[Circular]";
          seen.add(current);
        }
        return current;
      },
      2
    );
  } catch (error) {
    return JSON.stringify({
      snapshotError:
        error instanceof Error ? error.message : "Unable to stringify payload",
    });
  }
}

export function traceArrayField(value: unknown, fieldLabel: string): void {
  const isArray = Array.isArray(value);
  console.log(`FIELD ${fieldLabel} IS ARRAY:`, isArray);
  console.log(`FIELD ${fieldLabel} TYPEOF:`, typeof value);
  console.log(`FIELD ${fieldLabel} LENGTH:`, isArray ? value.length : "N/A");
}

export function traceBoundary(
  boundary: string,
  payload: unknown,
  arrayFields: Record<string, unknown> = {}
): void {
  console.log(`[TRACE ${boundary}] SNAPSHOT:`, safeJsonSnapshot(payload));
  for (const [fieldLabel, fieldValue] of Object.entries(arrayFields)) {
    traceArrayField(fieldValue, fieldLabel);
  }
}

export function crashGuard<T>(value: T | null | undefined, label: string): T {
  if (value === null || value === undefined) {
    const error = new Error(
      `[CRASH_GUARD] ${label} is ${value === null ? "null" : "undefined"}`
    );
    console.error(`[CRASH_GUARD] ${label} FAILURE`, {
      value,
      stack: error.stack,
    });
    throw error;
  }
  return value;
}
