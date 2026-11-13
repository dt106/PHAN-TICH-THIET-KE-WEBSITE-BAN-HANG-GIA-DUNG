# Chức năng cửa hàng (FRONT_END)

Khách hàng dùng `FRONT_END` (Vite, cổng 3000). API admin (`/api/admin/*`) thuộc app quản trị, không làm ở đây.

Nguồn hợp đồng: `BACK_END/API_DOCS/BACKEND_API_DOCUMENTATION.md`.

## Cách chạy

- Backend: `http://localhost:5000`. Vite proxy `/api` sang cổng đó, nên trình duyệt gọi cùng origin.
- `CLIENT_URL` của backend phải là `http://localhost:3000` thì VNPay redirect về `/payment/result`.
- Token JWT khách (`role=customer`) lưu ở `localStorage` khóa `gd_token`, gửi header `Authorization: Bearer`.
- Giỏ, yêu thích, địa chỉ, checkout, đơn, thanh toán của tôi, thống kê: bắt buộc đăng nhập. Chưa đăng nhập thì chuyển `/login?next=`.
- Phí vận chuyển client gửi cố định 30.000đ (`src/lib/money.ts`). Backend chưa có bảng phí. Thuế luôn 0.
- MoMo / ZaloPay không hiện vì backend chưa tạo được URL thanh toán. COD, chuyển khoản, VNPay có.
- `PAYMENT_ENV=mock`: sau khi đặt VNPay, frontend gọi `POST /api/payments/mock/complete` rồi mở trang kết quả.

## Màn hình và API

| Route | Việc làm | API |
|---|---|---|
| `/` | Danh mục gốc, sản phẩm nổi bật | `GET /api/categories?parentId=null`, `GET /api/products/featured` |
| `/shop` | Lọc danh mục, thương hiệu, từ khóa, sắp xếp, phân trang | `GET /api/products`, `GET /api/categories`, `GET /api/brands` |
| `/shop/:slug` | Chi tiết, ảnh, biến thể, liên quan, thêm giỏ, yêu thích | `GET /api/products/slug/:slug`, `GET /api/products/related/:id`, `POST /api/cart`, `POST /api/wishlist` |
| `/login` | Đăng nhập. Đăng ký: gửi OTP → xác nhận OTP → tạo tài khoản | `POST /api/customer/login`, `/register/request-otp`, `/register/verify-otp`, `/register` |
| `/forgot-password` | OTP quên mật khẩu, không lộ email có tồn tại | `POST /api/customer/forgot-password`, `/reset-password` |
| `/account` | Hồ sơ (kèm avatar), đổi mật khẩu, địa chỉ, thống kê, lịch sử thanh toán, đăng xuất | `GET /api/customer/me`, `PATCH /api/customer/profile`, `POST /api/customer/change-password`, `POST /api/customer/logout`, `/api/user-addresses`, `GET /api/customer/statistics/overview`, `GET /api/payments/my-payments` |
| `/wishlist` | Danh sách, chuyển vào giỏ, xóa | `GET/POST/DELETE /api/wishlist`, `POST /api/wishlist/:id/move-to-cart` |
| `/cart` | Sửa số lượng, xóa dòng. Tạm tính chỉ hàng còn bán | `GET/POST/PUT/DELETE /api/cart` |
| `/checkout` | Chọn địa chỉ đã lưu hoặc nhập mới, mã giảm, xem tổng, đặt hàng | `GET /api/coupons/public`, `POST /api/checkout/preview`, `POST /api/checkout` |
| `/orders` | Đơn của tôi, lọc trạng thái | `GET /api/orders/my-orders` |
| `/orders/:id` | Chi tiết, dòng hàng, hủy (`pending`/`confirmed` và chưa `paid`), xác nhận đã nhận khi `delivered`. Chuyển khoản hiện thông tin ngân hàng | `GET /api/orders/:id`, `GET /api/orders/:id/items`, `PUT .../cancel`, `PUT .../confirm-delivery`, `POST /api/payments` |
| `/payment/result` | Trang cổng thanh toán trả về (`order`, `status=success\|failed\|invalid`) | redirect từ `GET /api/payments/vnpay/return` |
| `/tro-ly` | Tìm sản phẩm bằng AI, hoặc chat (session khách trong `gd_ai_session`) | `POST /api/ai/products/search`, `POST /api/ai/chat` |
| `/about`, `/contact` | Nội dung tĩnh, không có API | — |

Thêm từ thẻ sản phẩm không chọn biến thể. Sản phẩm có biến thể nên thêm ở trang chi tiết.

## Mã nguồn

- `src/services/http.ts` — envelope `{ success, message, data, pagination }`, lỗi `ApiError` (kèm `errors`, `retryAfter`).
- `src/services/*.service.ts` — một file một nhóm API khách.
- `src/contexts` — phiên đăng nhập và giỏ (giỏ đọc lại sau mỗi lần sửa).
- `src/routes/router.tsx` — route ở bảng trên. Nhóm cần đăng nhập bọc `RequireAuth`.

## Không làm trong bản này

- Toàn bộ CRUD admin, thống kê admin, hoàn tiền thủ công.
- Thanh toán một phần giỏ (`selectedCartItemIds`).
- Đổi email admin, upload media sản phẩm (media là URL do admin tạo).
- Hội thoại AI: chưa có màn danh sách / xóa cuộc trò chuyện (`/api/ai/chat/conversations`). Chat vẫn gửi `conversationId` của phiên hiện tại.
