import { useCallback, useEffect, useState } from "react";
import { errorText } from "../services/http.ts";

type Result<T> = { key: string; tick: number; data?: T; error: string };

export function useRequest<T>(fn: () => Promise<T>, deps: readonly unknown[]) {
  const key = JSON.stringify(deps);
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const reload = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    fn()
      .then((data) => {
        if (!cancelled) setResult({ key, tick, data, error: "" });
      })
      .catch((reason: unknown) => {
        if (!cancelled) setResult((current) => ({ key, tick, data: current?.data, error: errorText(reason) }));
      });
    return () => {
      cancelled = true;
    };
    // fn theo key/tick của caller; đưa fn vào deps sẽ gọi lại mỗi render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);

  const ready = result?.key === key && result.tick === tick;
  return {
    data: result?.data,
    error: ready ? result.error : "",
    loading: !ready,
    reload,
  };
}
