import { toast } from "react-hot-toast";
import { errorText } from "../../../services/http.ts";
import { ToastView, type ToastVariant } from "./Toast.tsx";

const ariaByVariant = {
  success: { role: "status", "aria-live": "polite" },
  warning: { role: "status", "aria-live": "polite" },
  error: { role: "alert", "aria-live": "assertive" },
} as const;

/** Hiện một toast. Trả về id để gọi `toast.dismiss(id)` nếu cần đóng sớm. */
export function showToast(message: string, variant: ToastVariant = "success") {
  return toast.custom(
    (item) => (
      <ToastView
        visible={item.visible}
        variant={variant}
        message={message}
        onDismiss={() => toast.dismiss(item.id)}
      />
    ),
    {
      duration: 4000,
      ariaProps: ariaByVariant[variant],
    },
  );
}

export const toastError = (error: unknown) => showToast(errorText(error), "error");
