# BẢNG BẰNG CHỨNG KIỂM THỬ END-TO-END — 2026-10-24

> Mục đích: bằng chứng cuối cùng khép cụm thay đổi backend (pagination chuẩn hóa · API confirm-delivery · refund tự động · COD ghi tiền tại delivered) trước khi **đóng băng tài liệu API gửi dev**.

## 1. Môi trường kiểm thử

| Hạng mục | Giá trị |
|---|---|
| Máy | Windows (win32 10.0.26200), Node v24.15.0 |
| Git | branch `do/feat`, HEAD `943cd38` (Merge branch 'do/feat' into main) |
| MongoDB | **Docker container `giadung-mongo`**, image `mongo:7`, port 27017 — **database trắng** `BAN_HANG_GIA_DUNG` (mọi collection do server tự tạo, dữ liệu test do script tự seed và tự dọn) |
| Backend server | `npm run dev` (tsx) port 5000, **`PAYMENT_ENV=mock`** (đè bằng env var, cho phép `POST /api/payments/mock/complete`) |
| Typecheck trước khi chạy | `npx tsc --noEmit` → **0 lỗi** |
| Lệnh chạy | `npm test` (chuỗi 14 suite `&&`, package.json script `test`) |
| Log gốc | [`AUDIT/e2e-logs/2026-10-24-npm-test-full.log`](./e2e-logs/2026-10-24-npm-test-full.log) |

## 2. Kết quả tổng hợp — 14/14 suite, 242/242 PASS, 0 FAIL

| # | Suite | Kết quả |
|---|---|---|
| 1 | test-category | **22 PASS / 0 FAIL** |
| 2 | test-attribute | **18 PASS / 0 FAIL** |
| 3 | test-product | **32 PASS / 0 FAIL** |
| 4 | test-product-variant | **22 PASS / 0 FAIL** |
| 5 | test-product-media | **19 PASS / 0 FAIL** |
| 6 | test-session3-integration | **11 PASS / 0 FAIL** |
| 7 | test-cart | **14 PASS / 0 FAIL** |
| 8 | test-wishlist | **11 PASS / 0 FAIL** |
| 9 | test-coupon | **26 PASS / 0 FAIL** |
| 10 | test-session4-integration | **12 PASS / 0 FAIL** |
| 11 | test-checkout | **11 PASS / 0 FAIL** |
| 12 | test-order | **20 PASS / 0 FAIL** |
| 13 | test-order-item | **10 PASS / 0 FAIL** |
| 14 | test-payment | **14 PASS / 0 FAIL** |
| | **TỔNG** | **242 PASS / 0 FAIL — `npm test` exit 0** |

## 3. Bằng chứng cho 4 cụm thay đổi trọng điểm (trích log gốc)

### 3.1 COD ghi nhận tiền tại `delivered` (quyết định chủ dự án 2026-10-24)

```
PASS | shipping -> delivered (da giao, COD ghi nhan tien tai day) | confirmed=200 | processing=200 | shipping=200 | delivered=200 | deliveredAt=true | paymentStatus=paid
PASS | delivered -> completed (khach xac nhan), payment giu la paid | HTTP 200 | status=completed | paymentStatus=paid
```

→ Đơn COD vào `delivered` là `paymentStatus=paid` ngay (tiền thu lúc giao); `completed` chỉ là khách xác nhận, giữ nguyên `paid`.

### 3.2 Refund tự động — hủy đơn đã paid & hoàn trả hàng (phương án c)

```
PASS | Hoan tra don paid -> refunded (ca Order va Payment) | HTTP 200 | orderPaymentStatus=refunded | paymentRefunded=true | refundAmount=500000 | code=RF-TESTPAY-RET-1793286929201
PASS | Admin huy don da paid -> tu dong refund (Order + Payment) | HTTP 200 | orderPaymentStatus=refunded | paymentRefunded=true | refundAmount=500000
```

→ Cả hai đường (`returned` lẫn admin `cancelled` đơn paid) đều ghi bản ghi Payment `refunded` kèm `refundAmount` + mã `RF-…` (bất đối xứng cũ "chỉ sửa Order" đã hết).

### 3.3 API mới `PUT /api/orders/:id/confirm-delivery`

```
PASS | Khach xac nhan da nhan hang: delivered -> completed | crossUser=404 | confirm=200 | status=completed | completedAt=true | again=400
```

→ Người khác sở hữu bị chặn 404; owner xác nhận 200 → `completed` + `completedAt`; xác nhận lặp 400. Kèm các case nền: `Chan huy don da delivered → 400` (muốn trả hàng phải dùng `returned`).

### 3.4 Pagination chuẩn hóa (`data` = mảng, `pagination` top-level, `summary` top-level)

```
PASS | Danh sach don cua toi | HTTP 200 | total=2                      ← my-orders đọc json.pagination.total
PASS | Admin tim kiem theo ma don | HTTP 200 | total=1                 ← admin orders
PASS | Admin loc theo userId | HTTP 200                                ← data là mảng trực tiếp
PASS | Admin list tim kiem SALE10 kèm phân trang                       ← coupon admin
PASS | Admin xem lịch sử Used10 có 1 lượt dùng | status=200, items=1   ← coupon usages
```

→ 7 endpoint đổi shape (my-orders, admin orders, admin payments, admin coupons, coupon usages, admin order-items, admin customers) đều trả đúng contract mới; các endpoint vốn đúng sẵn (brand/category/product) không hồi quy.

## 4. Ghi chú quá trình (minh bạch)

Chạy 3 lượt để đạt kết quả sạch:

| Lượt | Kết quả | Nguyên nhân & xử lý |
|---|---|---|
| 1 | Dừng ở test-coupon (2 FAIL) | Kỳ vọng test đọc `data.pagination` cũ (sót trong đợt migrate) — **response server đúng contract mới** (đã đối chiếu bằng curl trực tiếp: `{"data":[],"pagination":{...}}`). Sửa 3 chỗ đọc trong `test-coupon.ts` |
| 2 | Coupon pass; dừng ở test-session4 (1 FAIL) | Kịch bản cross-user kỳ vọng 400 cũ → mã chuẩn hóa là **404** (dữ liệu vẫn bảo vệ nguyên vẹn: cart/wishlist của User A không đổi). Sửa 3 phép so sánh trong `test-session4-integration.ts` |
| 2 (tiếp) | Dừng ở test-order (crash script dòng 284) | 2 chỗ đọc shape cũ còn sót (`data.orders`, `data.summary`). Sửa `test-order.ts` + `test-order-item.ts` |
| 3 (bằng chứng chính thức) | **14/14 suite, 242/242 PASS, exit 0** | — |

Tất cả 5 điểm điều chỉnh trên đều là **kỳ vọng của test script**, không phải lỗi sản phẩm — mọi thay đổi hành vi (400→404, vị trí pagination) là chủ đích theo chuẩn hóa đã chốt và đã cập nhật vào `AUDIT/API_CATALOG.md`.

## 5. Tái lập (reproduce)

```bash
# 1. MongoDB (Docker, DB trắng)
docker run -d --name giadung-mongo -p 27017:27017 mongo:7

# 2. Server (PAYMENT_ENV=mock để payment suite chạy được mock/complete)
cd BACK_END && PAYMENT_ENV=mock npm run dev

# 3. Chạy toàn bộ
npm test          # terminal khác
```

## 6. Kết luận

- Toàn bộ 14 suite integration (242 case) PASS trên database trắng, mã lỗi/mã trạng thái/response shape khớp 100% với mô tả trong **`AUDIT/API_CATALOG.md`** (đã cập nhật contract pagination ở Phụ lục B và endpoint confirm-delivery ở mục 18).
- **Tài liệu API đủ điều kiện đóng băng gửi dev.**
- Cơ sở dữ liệu sau kiểm thử: các suite tự dọn dữ liệu của mình (seed→cleanup); DB về trạng thái trống sau lượt chạy cuối.
