import { useEffect, useRef } from "react";

const DEBOUNCE_MS = 800;
const MIN_CHARS = 2;

export function useSearchLogger(
  query: string,
  context: string,
  resultsCount: number | undefined,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLoggedRef = useRef<string>("");

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const trimmed = query.trim();

    if (trimmed.length < MIN_CHARS) {
      lastLoggedRef.current = "";
      return;
    }

    timerRef.current = setTimeout(async () => {
      if (trimmed === lastLoggedRef.current) return;
      lastLoggedRef.current = trimmed;

      try {
        await fetch("/api/search-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: trimmed,
            context,
            resultsCount: resultsCount ?? null,
          }),
        });
      } catch {
        // Fire-and-forget — silently ignore errors
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, context, resultsCount]);
}
