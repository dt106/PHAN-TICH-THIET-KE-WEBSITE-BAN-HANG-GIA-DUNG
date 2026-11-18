import { useState } from "react";
import { toastError } from "../components/common/Toast/showToast.tsx";

export function useAction() {
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      return true;
    } catch (reason) {
      toastError(reason);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return [busy, run] as const;
}
