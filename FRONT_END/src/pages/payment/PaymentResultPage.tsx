import { useSearchParams } from "react-router-dom";
import { ButtonLink } from "../../components/common/index.ts";
import styles from "./PaymentResultPage.module.css";

type Tone = "success" | "error";

const results: Record<string, { tone: Tone; title: string; text: string }> = {
  success: {
    tone: "success",
    title: "Thanh toán MoMo thành công",
    text: "Cảm ơn bạn! Đơn hàng đã được thanh toán và sẽ sớm được xử lý.",
  },
  placed: {
    tone: "success",
    title: "Đặt hàng thành công",
    text: "Bạn chọn thanh toán khi nhận hàng. Chúng tôi sẽ liên hệ xác nhận đơn sớm nhất.",
  },
  failed: {
    tone: "error",
    title: "Thanh toán MoMo chưa thành công",
    text: "Giao dịch bị hủy hoặc thất bại. Đơn hàng vẫn được giữ — mở lại đơn hàng hoặc mục Tài khoản để thanh toán MoMo lần nữa.",
  },
  invalid: {
    tone: "error",
    title: "Không xác thực được giao dịch",
    text: "Chữ ký hoặc dữ liệu từ cổng thanh toán không hợp lệ. Vui lòng liên hệ cửa hàng nếu đã bị trừ tiền.",
  },
};

export function PaymentResultPage() {
  const [params] = useSearchParams();
  const order = params.get("order") ?? "";
  const id = params.get("id");
  const result = results[params.get("status") ?? ""] ?? {
    tone: "success" as Tone,
    title: "Đã nhận kết quả",
    text: "Cổng thanh toán đã phản hồi. Kiểm tra trạng thái trong danh sách đơn hàng.",
  };

  return (
    <div className={styles.page}>
      <div className={`card ${styles.card}`}>
        <span className={styles.icon} data-tone={result.tone}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            {result.tone === "success" ? <path d="m5 12.5 4.5 4.5L19 7.5" /> : <path d="M7 7l10 10M17 7 7 17" />}
          </svg>
        </span>
        <h1>{result.title}</h1>
        <p>{result.text}</p>
        {order ? (
          <div className={styles.order}>
            Mã đơn hàng <strong>{order}</strong>
          </div>
        ) : null}
        <div className={styles.actions}>
          <ButtonLink to={id ? `/orders/${id}` : "/orders"}>Xem đơn hàng</ButtonLink>
          <ButtonLink to={result.tone === "error" ? "/account" : "/shop"} variant="outline">
            {result.tone === "error" ? "Thanh toán lại" : "Tiếp tục mua sắm"}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
