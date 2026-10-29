# BÁO CÁO KHẢO SÁT BACKEND — PHASE 1: DISCOVERY & API AUDIT

- **Ngày:** 2026-10-22 · **Branch:** `do/feat` (HEAD `ef4172b`) · **Phạm vi:** `BACK_END/`
- **Người thực hiện:** Backend Architect / Business Analyst (audit chỉ đọc — không sửa source, không đổi DB, không đổi cấu hình)
- **Tài liệu kèm:** [API_CATALOG.md](./API_CATALOG.md) — danh mục 119 endpoint kèm controller/service/validator/entity và mức xác minh.

**Thang xác minh dùng trong báo cáo:** VERIFIED (đọc code toàn diện) · PARTIALLY VERIFIED (đọc một phần hoặc chỉ có bằng chứng gián tiếp) · INFERRED (suất đoán có cơ sở từ cấu trúc code) · UNKNOWN (chưa kiểm tra được) · CONFLICT (code mâu thuẫn code khác hoặc code mâu thuẫn tài liệu).

---

## 1. Tổng quan kiến trúc

### 1.1 Bố cục repository (VERIFIED)

Monorepo 3 project, chạy đồng thời bằng `concurrently` từ root (`package.json` script `dev`):

| Project | Stack | Vai trò | Ghi chú |
|---|---|---|---|
| `FRONT_END/` | React 19 + Vite (port 3000) | Storefront khách hàng | **Chưa kết nối API backend** (xem §1.5) |
| `ADMIN/` | React 19 + Vite + Storybook | Quản trị | **Chưa kết nối API backend** |
| `BACK_END/` | Node.js + Express 5 + TypeScript (tsx), port 5000 | REST API | Trọng tâm audit |

### 1.2 Kiến trúc backend (VERIFIED)

Phân lớp 1 chiều, không có repository layer, không DTO class (dùng TS interface + express-validator):

```
server.ts  →  app.ts (mount routes, CORS, JSON, 404 + error handler cuối)
   ↓
src/routes/*.routes.ts        (route + gắn validator + middleware)
   ↓
src/middlewares/              (auth, role, validate, upload/multer, error)
   ↓
src/controllers/*.ts          (đọc req, gọi service, đóng gói response)
   ↓
src/services/*.ts             (toàn bộ business logic, query Mongoose)
   ↓
src/models/*.model.ts         (25 Mongoose model, plugin toJSON)
```

- **Framework:** Express `^5.2.1`, TypeScript strict, chạy bằng `tsx` (không biên dịch khi dev). `BACK_END/package.json:7-9`.
- **Entry:** `server.ts` — kết nối MongoDB, **tự tạo 25+ collection** bằng `model.createCollection()` cho mọi model trong barrel `src/models/index.ts` (`server.ts:16-39`), rồi `app.listen`.
- **Điểm đáng chú ý trong `app.ts`:**
  - CORS `origin: true, credentials: true` — phản hồi mọi origin (`app.ts:59-64`). VERIFIED — rủi ro bảo mật nếu triển khai thật.
  - `adminStatisticsRoutes` bị mount **2 lần** cùng prefix `/api/admin/statistics` (`app.ts:108-121` và `app.ts:188`). Vô hại nhưng là dấu ghost code.
  - Không có helmet, không rate-limit, không request logging, không compression.
  - 404 JSON handler đặt trước error middleware (`app.ts:208-220`).

### 1.3 Database (VERIFIED)

- **MongoDB + Mongoose 9**, không có migration (schema-less). Collection/index được tạo runtime: `scripts/init-db.ts` (createCollection + syncIndexes) và tự động khi start server.
- CSDL phát triển: `BAN_HANG_GIA_DUNG` (`.env.example:2`; EVIDENCE mục XIV–XVI xác nhận seed import vào đây). Chi tiết schema: mục §4.

### 1.4 Tích hợp ngoài (VERIFIED)

| Tích hợp | Config | Hiện trạng |
|---|---|---|
| Cloudinary | `src/config/cloudinary.ts` (3 env `CLOUDINARY_*`) | Chỉ dùng upload **avatar** (`upload.service.ts`). ProductMedia nhận URL từ JSON — không upload file |
| SMTP (nodemailer) | `src/config/mail.ts` (`MAIL_HOST/PORT/USER/PASSWORD/FROM`) | Gửi email OTP 3 loại. ⚠️ `debug: true, logger: true` bật vô điều kiện; log OTP ra console |
| Google Gemini | `src/config/gemini.ts` (`GEMINI_API_KEY`, model mặc định `gemini-2.5-flash`) | AI Chat tư vấn + AI Product Search. Không có fallback khi lỗi (trừ retry 503/429 của search) |
| OpenAI | ~~`src/config/openai.ts` (`OPENAI_API_KEY`)~~ | **ĐÃ DỌN 2026-10-24** — xóa config + dependency; AI dùng hoàn toàn Gemini |
| VNPay / MoMo / ZaloPay | `src/config/payment.ts` (chỉ là hằng số env, không SDK) | VNPay: có build URL + HMAC-SHA512 thật. MoMo/ZaloPay: **chỉ có hàm verify callback, không có bước tạo đơn/gọi API gateway** → không thể phát sinh giao dịch thật |
| Ngân hàng (BANK) | `BANK_NAME/BANK_ACCOUNT_NO/BANK_ACCOUNT_HOLDER` | Chỉ là chuỗi thông tin chuyển khoản trả về client |

**Không có** background job/cron/queue, không event bus, không WebSocket. "Webhook" duy nhất là 4 endpoint IPN/callback của cổng thanh toán (xem API_CATALOG mục 22).

### 1.5 Phát hiện quan trọng nhất: frontend chưa gọi backend (VERIFIED)

Tìm kiếm triệt để trong `FRONT_END/src` + `ADMIN/src` + bundle đã build: **không có axios, fetch ứng dụng, XMLHttpRequest, WebSocket, biến `VITE_*`, proxy nào cả**. Cả hai app chạy bằng mock data cứng + localStorage (`furniro-cart`, `furniro-orders`, `furniro-user`; ADMIN dùng `src/mocks/*.mock.ts`; login ADMIN nhận mọi tài khoản, không lưu token; `ProtectedRoute` là pass-through).

→ Hệ quả cho giai đoạn 2: **luồng truy vết "Frontend → API" không tồn tại trên thực tế**. Mọi contract phải lấy từ backend + tài liệu PROMPT/EVIDENCE. Toàn bộ 119 endpoint hiện "chưa được tiêu thụ".

### 1.6 Tài liệu & test hiện có (VERIFIED)

- `BACK_END/DOCUMENT/` (27 file, **bị .gitignore**): kế hoạch tổng `KE_HOACH_PHAT_TRIEN_BACKEND_PHAN_QUYEN.md/.docx` (mục I–XXIII), 13 `PROMPT_THUC_THI_MUC_*`, 8 `EVIDENCE/BIEN_BAN` (biên bản test thủ công 2026-10-09 → 10-14, tổng 223 PASS/13 suite + 14 PASS payment), seed `DATABASE_MAU_XIV_TO_XVI.json`.
- **Không có** OpenAPI/Swagger/Postman/.http nào trong repo. Tài liệu endpoint "giàu nhất" là §3.1 trong từng PROMPT (bảng method/path/role) — nhưng nhiều chỗ mâu thuẫn code (xem §7).
- `BACK_END/scripts/test-*.ts` (14 file): **script tích hợp thủ công** chạy `tsx` + `fetch` vào server thật (port 5000) + MongoDB thật, tự đúc JWT, tự clean DB. **Không phải test framework** — không có jest/vitest/mocha; `npm test` là chuỗi `&&` 13 script (thiếu `test:payment`).

---

## 2. Danh mục module nghiệp vụ

| Module | Mục đích | API chính | Service | Model | Phụ thuộc | Trạng thái xác minh |
|---|---|---|---|---|---|---|
| **Auth Customer** | ĐK (OTP email) / đăng nhập / quên–đổi MK / hồ sơ | 10 endpoint `/api/customer/*` | customer.service, otp.service | User | SMTP (OTP), Cloudinary (avatar) | VERIFIED (code); PARTIALLY VERIFIED (không có EVIDENCE — mục II "pre-existing") |
| **Auth Admin** | Như trên + đổi email qua OTP | 9 endpoint `/api/admin/*` | admin.service, otp.service | User | SMTP, Cloudinary | VERIFIED |
| **QL Khách hàng (Admin)** | Xem/lọc/khóa-mở khách hàng | 3 endpoint `/api/admin/customers` | admin/admin.customer.service | User | — | VERIFIED |
| **Catalog: Category** | Cây danh mục, sort, toggle | 11 endpoint | category.service | Category (self-ref) | Product (ràng buộc xóa) | VERIFIED + EVIDENCE 22/22 |
| **Catalog: Brand** | Thương hiệu | 9 endpoint | brand.service (cung cấp `HttpError`, `generateSlug` dùng chung) | Brand | Product | VERIFIED + EVIDENCE 26/26 |
| **Catalog: Attribute** | Thuộc tính + giá trị thuộc tính | 8 endpoint | attribute.service | Attribute, AttributeValue | VariantAttribute | VERIFIED + EVIDENCE 18/18 |
| **Catalog: Product** | Sản phẩm, featured, giá | 12 endpoint | product.service | Product, Category, Brand | Media/Variant/OrderItem | VERIFIED + EVIDENCE 32/32 |
| **Catalog: Variant** | Biến thể (SKU/giá/tồn kho) + sync min–max price | 8 endpoint | product-variant.service | ProductVariant, VariantAttribute | Product, OrderItem | VERIFIED + EVIDENCE 22/22 |
| **Catalog: Media** | Ảnh/video sản phẩm theo URL | 9 endpoint | product-media.service | ProductMedia | Product | VERIFIED + EVIDENCE 19/19 |
| **Cart** | Giỏ hàng 1 dòng/item, check tồn kho | 5 endpoint | cart.service | Cart, Product, ProductVariant | — | VERIFIED + EVIDENCE 14/14 |
| **Wishlist** | Yêu thích, chuyển sang giỏ | 7 endpoint | wishlist.service | Wishlist | Cart, Product | VERIFIED + EVIDENCE 11/11 |
| **Coupon** | Mã giảm giá + theo dõi sử dụng | 9 endpoint | coupon.service | Coupon, CouponUsage | Checkout/Order (ghi/rollback) | VERIFIED + EVIDENCE 26/26 |
| **Địa chỉ** | Sổ địa chỉ giao hàng | 6 endpoint | userAddress.service | UserAddress | Checkout | VERIFIED |
| **Checkout** | Preview + đặt hàng từ cart | 2 endpoint | checkout.service | Order, OrderItem, Cart, Coupon, ProductVariant | Coupon, Address | VERIFIED + EVIDENCE 11/11 |
| **Order** | Vòng đời đơn (state machine), hủy, hoàn kho | 3 user + 3 admin endpoint | order.service | Order, OrderItem, ProductVariant, Coupon, CouponUsage, Payment | Payment (COD) | VERIFIED + EVIDENCE 15/15 |
| **Order Item** | Snapshot line item + thống kê admin | 2 endpoint | order-item.service | OrderItem | Order | VERIFIED + EVIDENCE 10/10 |
| **Payment** | Phiên thanh toán, IPN gateway, refund | 7 user + 2 admin endpoint | payment.service | Payment, Order | VNPay (thật), MoMo/ZaloPay (stub), mock | VERIFIED code; PARTIALLY VERIFIED hành vi thật (EVIDENCE chỉ chạy `PAYMENT_ENV=mock`) |
| **Statistics** | Thống kê user (admin) + cá nhân (customer) | 1 admin + 3 customer endpoint | statistics/*.service | User, Order, ProductReview, Wishlist | Order | VERIFIED (⚠️ bug "delivered", xem §7) |
| **AI Search** | Tìm kiếm bằng ngôn ngữ tự nhiên (Gemini → filter MongoDB) | 1 endpoint | aiProductSearch.service + aiProductFilter.service | 8 model catalog (chỉ đọc) | Gemini | VERIFIED code; UNKNOWN hành vi runtime (không test, cần API key) |
| **AI Chat** | Trợ lý tư vấn sản phẩm có hội thoại | 5 endpoint | aiChat.service + aiChatProduct.service | AIConversation | Gemini, Product | VERIFIED code; UNKNOWN runtime |
| **(Chưa có API)** Notification / Announcement / Chat người thật / Review | — | **Không có route/controller/service** | — | Notification, Announcement (+Target/Read), Conversation, Message, ProductReview, OtpCode | — | VERIFIED = dead models (xem §7.3) |

---

## 3. Danh mục API (tóm tắt)

Chi tiết 119 endpoint (method, path, auth, controller, service, validator, entity, mức xác minh): xem **[API_CATALOG.md](./API_CATALOG.md)**.

Phân bổ theo nhóm:

| Nhóm | Số endpoint | Ghi chú phân quyền |
|---|---|---|
| Health | 1 | Public |
| Auth (customer + admin) | 19 | 6 public / 13 cần JWT |
| Quản lý khách hàng + statistics | 7 | Admin*/customer-guard trong route |
| Catalog (brand, category, attribute, product, variant, media) | 57 | Public: đọc tại `/api/<resource>`; admin tại `/api/admin/<resource>` (đồng nhất sau refactor 2026-10-22) |
| Cart + Wishlist + Coupon + Address | 27 | Đa số JWT; coupon public/check/admin |
| Checkout + Order + OrderItem + Payment | 21 | User (ownership) / Admin; 5 endpoint gateway là public theo thiết kế |
| AI | 6 | **Public hoàn toàn** (AI chat nhận sessionId khách) |

Điểm cần lưu ý khi viết tài liệu: **4 kiểu xử lý lỗi khác nhau** ở controller (try/catch status cố định; `error.statusCode`; `HttpError instanceof`; `next(error)`) dẫn tới một số case 4xx/5xx không đồng nhất — đã ghi nhận trong catalog theo từng handler.

---

## 4. Bản đồ database / entity

25 Mongoose model (`src/models/*.model.ts`), collection name do Mongoose tự plu ral (vd `users`, `orderitems`, `productmedias`). **Không model nào có hook (pre/post), virtual, instance method, discriminator** — toàn bộ logic nằm ở service. Mọi model (trừ `AIConversation`) dùng plugin `toJSON` (`src/models/plugins/toJSON.plugin.ts`): `_id → id`, bỏ `__v`, **xóa field `password` khi serialize**.

### 4.1 Sơ đồ quan hệ (theo `ref` — VERIFIED)

```
User ─┬─< UserAddress
      ├─< Cart >─── Product ──── Category (self-ref parentId)
      ├─< Wishlist >─ Product ── Brand
      ├─< Order >──── Coupon     ├─< ProductMedia
      │      └─< OrderItem >─────┴─< ProductVariant ──< VariantAttribute >── Attribute
      ├─< Payment >── Order                                  └──── AttributeValue
      ├─< CouponUsage >── Coupon, Order
      ├─< ProductReview >── Product, Order          (model sẵn, chưa có API)
      ├─< AIConversation (messages embed)           (API có)
      ├─< Notification / Announcement* / Conversation > Message   (dead models)
      └── OtpCode (dead model — OTP lưu RAM)
```

### 4.2 Enum & trạng thái chủ chốt (VERIFIED, trích nguyên văn)

| Trường | Giá trị | File |
|---|---|---|
| `User.role` | `customer`, `admin` | `User.model.ts` |
| `User.status` | `active`, `inactive`, `blocked` | `User.model.ts` |
| `Order.status` | `pending`, `confirmed`, `processing`, `shipping`, **`delivered`** (mới 2026-10-22: đã giao — chờ khách xác nhận), `completed`, `cancelled`, `returned` | `Order.model.ts` |
| `Order.paymentStatus` | `pending`, `paid`, `failed`, `refunded` | `Order.model.ts` |
| `Payment.status` | `pending`, `paid`, `failed`, `refunded` — **đồng nhất với Order từ 2026-10-22** (đã bỏ `processing`) | `Payment.model.ts` |
| `Order/Payment.paymentMethod` | `COD`, `BANK`, `MOMO`, `VNPAY`, `ZALOPAY` | 2 model |
| `Coupon.discountType` | `percentage`, `fixed` | `Coupon.model.ts` |
| `ProductMedia.mediaType` | `image`, `video` | `ProductMedia.model.ts` |
| `OtpCode.type` (dead) | `register`, `forgot_password`, `verify_email` — lệch với `OTPType` service: `register`, `reset_password`, `change_email` (giữ nguyên theo quyết định C3) | `OtpCode.model.ts` vs `otp.service.ts:49` |

State machine Order cập nhật (2026-10-22; sửa 2026-10-24): `pending → confirmed → processing → shipping → {delivered | completed | cancelled}`; `delivered → {completed | returned}`; `completed → returned`. **COD ghi nhận tiền ngay khi vào `delivered`** (từ 2026-10-24, quyết định chủ dự án — `completed` chỉ là khách xác nhận; giữ nhánh `completed` cho đường rút ngắn shipping→completed, `recordCodPayment` idempotent).

### 4.3 Ràng buộc & index đáng chú ý cho việc viết tài liệu

- Unique: `User.email`, `Category.slug`, `Brand.slug`, `Product.slug`, `Product.sku`, `ProductVariant.sku`, `AttributeValue (attributeId+value)`, `VariantAttribute (variantId+attributeId)`, `Cart (userId+productId+variantId)`, `Wishlist (userId+productId)`, `Order.orderNumber`, `CouponUsage.orderId`, `Payment.transactionCode` (sparse), `UserAddress` — tối đa 1 default/người (partial unique index).
- TTL index trên `OtpCode.expiresAt` — nhưng model không dùng (OTP thực nằm trong `Map` RAM của `otp.service.ts`).
- `Coupon` không có trường status — trạng thái = `isActive` + cửa sổ `startsAt/expiresAt`.
- `OrderItem` là **snapshot** (lưu productName/SKU/đơn giá tại thời điểm đặt) — không join động.

---

## 5. Authentication & Permission overview (VERIFIED)

### 5.1 Cơ chế

- **JWT stateless** (`src/utils/jwt.ts`): payload `{userId, role}`, secret `JWT_SECRET`, hết hạn `JWT_EXPIRES_IN` (mặc định `7d`).
- **`authMiddleware`** (`src/middlewares/auth.middleware.ts:32-90`): đọc `Authorization: Bearer <token>`, verify, gắn `req.user = {userId, role}`. Trả 401 khi thiếu/sai.
- **`roleMiddleware(...roles)`** (`src/middlewares/role.middleware.ts:23-53`): chặn 403 nếu role không nằm trong danh sách.
- 2 route file tự viết guard riêng thay vì dùng `roleMiddleware`: `admin.customer.routes.ts` và 2 statistics routes (`requireAdmin`/`requireCustomer` nội bộ).
- Password: bcrypt 12 rounds (customer.service/admin.service); User.password `select: false`.
- Ownership: service tự kiểm (`getOrderDetailForUser`, `getOrderItems`, `getUserAddressByIdService`… trả 404 khi không phải chủ).

### 5.2 OTP (VERIFIED — nhưng khác thiết kế model)

`otp.service.ts`: OTP 6 số (`crypto.randomInt`), lưu **`Map` trong RAM** keyed `email:type`; hết hạn 5 phút; cooldown gửi lại 60 giây (HTTP 429 + `retryAfter`); tối đa 5 lần thử sai; một lần verify. 3 type thực tế: `register` / `reset_password` / `change_email`. Gửi qua nodemailer (`mail.ts`). → **Model `OtpCode` và collection `otpcodes` không bao giờ được ghi** (dead); mất OTP khi restart server / không chạy đa instance được.

### 5.3 Lỗ hổng/khoảng trống phân quyền cần ghi rõ trong tài liệu

1. **`authMiddleware` không kiểm tra `User.status`**: customer bị `blocked`/`inactive` vẫn dùng token còn hạn để đặt hàng, thanh toán, chat AI… (chỉ `login` và `change-password` chặn). VERIFIED — quan trọng cho tài liệu lẫn vận hành.
2. **AI endpoints hoàn toàn public** (`/api/ai/*` không có auth middleware) — tốn chi phí Gemini nếu bị quét; không rate-limit.
3. **`POST /api/payments/mock/complete` public** khi `PAYMENT_ENV=mock` — chỉ an toàn nhờ check env; nếu ai đó đặt `PAYMENT_ENV=mock` ở production thì ai cũng xác nhận được thanh toán.
4. Admin của `admin.customer.routes` dùng guard tự viết trùng lặp logic `roleMiddleware` — khác thông điệp lỗi 401/403 một chút giữa các nhóm API.
5. CORS mở mọi origin + credentials (§1.2).

---

## 6. Nghiệp vụ cần truy vết end-to-end (đề xuất Phase 2)

> Bối cảnh: frontend chưa gọi API (§1.5) nên mỗi luồng thay "Frontend" bằng **script test/EVIDENCE + contract tài liệu**. Ưu tiên xếp theo rủi ro tài liệu sai.

### 6.1 Checkout → Đặt hàng → Thanh toán → Trạng thái đơn (ưu tiên cao nhất)

Luồng đầy đủ nhất, dính 6 model + gateway:
`POST /api/checkout/preview` → `POST /api/checkout` (trừ kho `$inc`, snapshot OrderItem, `Coupon.usedCount++`, CouponUsage, xóa Cart) → `POST /api/payments` (session 15 phút, URL VNPay/mock) → `GET /api/payments/vnpay/return|ipn` (HMAC, idempotent theo `transactionCode`, khớp `amount`) → `PUT /api/admin/orders/:id/status` (state machine; `completed`+COD tự ghi Payment paid) → `PUT /api/orders/:id/cancel` / `returned` (hoàn kho, rollback coupon, refunded).

Cần kiểm tra thêm khi truy vết: (a) **không transaction** — xác định từng bước fail giữa chừng thì dữ liệu nào lệch; (b) `$inc` kho không có guard `>= 0` → âm kho khi concurrency; (c) `shippingFee` client tự gửi, `taxAmount = 0` cố ý hay tạm; (d) admin hủy đơn đã paid không set `paymentStatus=refunded` (chỉ `returned` có). Tình trạng: **VERIFIED code + EVIDENCE (mock)**.

### 6.2 Đăng ký customer bằng OTP

`request-otp → verify-otp → register` (cờ verified nằm RAM) → login → JWT; kèm nhánh forgot/reset password và blocked-status. Cần truy vết vì: OTP RAM (restart mất cờ), không EVIDENCE nào phủ auth, và luồng admin change-email là biến thể riêng. Tình trạng: **VERIFIED code, chưa có test**.

### 6.3 Coupon: kiểm tra → áp dụng → rollback

`POST /api/coupons/check` (7 bước validate + công thức percentage/fixed, cap `maximumDiscountAmount`, `Math.round`) → checkout ghi usage → cancel/return rollback (`deleteMany` CouponUsage + `$inc usedCount -n`). Cần đối chiếu công thức với EVIDENCE mục XIII và hành vi xóa coupon bị chặn. Tình trạng: **VERIFIED + EVIDENCE**.

### 6.4 AI Product Search & AI Chat (luồng bất đồng bộ/external)

`POST /api/ai/products/search`: prompt Gemini (temperature 0, JSON mode) → `normalizeFilters` (clamp mọi giá trị) → `filterProductsFromDatabase` (regex keywords → category/brand theo tên → attribute intersect → variant price/stock) → phân trang limit ≤ 20. `POST /api/ai/chat`: trích 8 sản phẩm theo keyword (không dùng AI) → Gemini sinh câu trả lời → lưu hội thoại. Cần truy vết: hành vi khi Gemini trả JSON lỗi/từ chối, giới hạn, và **chuẩn response thực tế** vì đây là nguồn dễ viết sai nhất trong tài liệu. Tình trạng: **VERIFIED code, UNKNOWN runtime (không test, cần GEMINI_API_KEY)**.

### 6.5 Cart ↔ Wishlist và ràng buộc tồn kho

Add/update/check stock, merge cùng (product, variant), move-to-cart (giữ wishlist nếu hết hàng), số ảo 9999 cho sản phẩm không biến thể. Tình trạng: **VERIFIED + EVIDENCE**.

### 6.6 Admin quản trị danh mục (category cycle-guard, delete-guard)

Xóa bị chặn khi còn quan hệ (brand←product, category←con/sản phẩm, attribute←variant, variant/media←orderitem, coupon←usage); cập nhật parent chống vòng lặp; media tự thăng primary. Tình trạng: **VERIFIED + EVIDENCE**.

---

## 7. Vấn đề & câu hỏi mở

### 7.1 CONFLICT — code ↔ code

| # | Vấn đề | Bằng chứng | Trạng thái |
|---|---|---|---|
| C1 | Enum `paymentStatus` lệch: Order không có `processing`, Payment có | `Order.model.ts` vs `Payment.model.ts` | **ĐÃ GIẢI QUYẾT 2026-10-22** (phương án 1): bỏ `"processing"` khỏi `Payment.model.ts` (type + enum), 2 query `$in` trong `payment.service.ts` về `["pending"]`, whitelist `payment.validator.ts`. Không cần migration — không có code path nào ghi `processing`. Kiểm chứng 16/16 PASS |
| C2 | `COMPLETED_ORDER_STATUSES = ["delivered","completed"]` — `delivered` không tồn tại trong enum Order | `customer.statistics.service.ts` | **ĐÃ GIẢI QUYẾT 2026-10-22 (theo nghiệp vụ chủ dự án)**: thay vì xóa `"delivered"`, đã **thêm trạng thái `delivered` vào Order** — giỏi hàng giao cho khách, chờ khách xác nhận. Thay đổi: `OrderStatus` type + enum, `deliveredAt` (interface + schema), state machine `shipping → delivered/completed/cancelled`; `delivered → completed/returned` (`delivered` không thể `cancelled` — hàng đã ở tay khách, phải dùng `returned`); whitelist `order.validator.ts`. Hằng số statistics `"delivered","completed"` giờ **hợp lệ đúng nghĩa** (đơn đã giao tính vào totalSpent). Đã thêm 3 kịch bản delivered vào `scripts/test-order.ts` |
| C3 | `OtpCode.type` enum ≠ `OTPType` service (và model dead) | §5.2 | **GIỮ NGUYÊN theo quyết định chủ dự án (2026-10-22)** — "không phải code của tôi". Finding mở: model OtpCode chết + OTP lưu RAM vẫn đúng như mô tả §5.2 |
| C4 | `adminStatisticsRoutes` mount 2 lần | `app.ts:108-121, 188` (cũ) | **ĐÃ GIẢI QUYẾT 2026-10-22**: xóa mount trùng, chỉ còn mount chính thức (section 11) |

### 7.2 CONFLICT — tài liệu ↔ code (rủi ro lớn nhất cho tài liệu API)

| # | Tài liệu nói | Code thực tế |
|---|---|---|
| D1 | Kế hoạch mục II dùng `/api/auth/*` | `/api/customer/*` + `/api/admin/*`; `otp.controller.ts` (dead) còn comment `/api/admin/auth/...` |
| D2 | Kế hoạch vẽ admin route dạng `/api/admin/brands`, `/api/products/:id/variants`… | Thực tế dạng resource-nested: `/api/brands/admin`, `/api/admin/products/:id/variants`… (chính EVIDENCE mục VI §3-note 6 đã nhận xét mâu thuẫn này). **→ ĐÃ GIẢI QUYẾT 2026-10-22:** refactor đồng nhất mọi admin API về `/api/admin/<resource>` (5 file mới `src/routes/admin/admin.{brand,category,attribute,product,coupon}.routes.ts`, gỡ path cũ, cập nhật 8 test script; verify runtime 18/18 PASS — xem ghi chú đầu `API_CATALOG.md`) |
| D3 | Kế hoạch/EVIDENCE mục XVII: "PAYMENT VNPAY/MOMO/ZALOPAY sandbox đã hoàn thành 14/14" | Chỉ VNPay build được URL thật; MoMo/ZaloPay **không có bước tạo đơn** — IPN verify tồn tại nhưng không bao giờ được gateway gọi trong thực tế; refund chỉ ghi DB. **→ ĐÃ CHỐT 2026-10-24: MoMo/ZaloPay là việc chưa làm xong, giữ nguyên stub chờ cấu hình** — tài liệu sẽ ghi "chưa kích hoạt" cho 2 phương thức này |
| D4 | Kế hoạch mục XXI "AI Product Assistant — planned" | AI Search + AI Chat **đã có code và route** (làm ngoài kế hoạch, không có PROMPT/EVIDENCE) |
| D5 | Kế hoạch mục XVIII–XX (Review, Admin Mgmt, Dashboard) | Không có API nào; riêng `ProductReview` chỉ được đếm trong statistics |
| D6 | `EVIDENCE_MUC_XVII` ghi "đã thêm test:payment vào npm test" | `package.json:27` chuỗi `test` thiếu `test:payment` |
| D7 | README root vẽ thư mục `DATABASE/` | Không tồn tại trong repo |

### 7.3 Dead code / dư thừa (VERIFIED bằng grep + đọc import)

1. `src/controllers/otp.controller.ts` — 5 handler, không route nào import.
2. Model chết (không service/controller nào import): `OtpCode`, `Announcement`, `AnnouncementTarget`, `AnnouncementRead`, `Notification`, `Conversation`, `Message`; `ProductReview` chỉ đọc ở statistics. → 7 collection rỗng vẫn được tạo lúc start (`server.ts` tạo collection cho mọi model trong barrel).
3. ~~`src/config/openai.ts` + dependency `openai`~~ **→ ĐÃ DỌN 2026-10-24:** xóa file config, bỏ dependency khỏi `package.json`, dọn code comment trong `aiProductSearch.service.ts`. `.env.example` cập nhật: bỏ OPENAI, thêm `GEMINI_*`/`CLOUDINARY_*` + ghi chú biến auth/SMTP.
4. `ADMIN/src/routes/routeConfig.tsx` — file 0 byte.

### 7.4 API contract thiếu/không nhất quán (ảnh hưởng trực tiếp tài liệu)

1. ~~**4 pattern xử lý lỗi khác nhau**~~ **→ ĐÃ GIẢI QUYẾT 2026-10-24 (phạm vi non-auth/AI-chat):** một quy tắc duy nhất — `AppError` (`src/utils/appError.ts`) + `error.middleware.ts` (kèm map ValidationError/CastError/E11000 → 400); 13 controller chuyển sang `next(error)`; guard tự viết thay bằng `roleMiddleware`. Verify 12/12 PASS. Auth + AI chat giữ pattern cũ theo giới hạn chủ dự án.
2. ~~Pagination không đồng nhất~~ **→ ĐÃ GIẢI QUYẾT 2026-10-24:** chuẩn hóa toàn bộ list endpoint — `data` là mảng, `pagination` `{page, limit, total, totalPages}` top-level, `summary` (nếu có) top-level. Đã cập nhật 4 service + 7 controller + 5 test script. `tsc --noEmit` pass 0 lỗi.
3. `getAdminProducts` trả thêm `stats`; `getOrderByIdAdmin` trả `itemCount`; `getCouponByIdAdmin` trả `totalDiscountAmountGiven` — các "trường bonus" này dễ bị bỏ sót khi viết doc.
4. ~~Một số endpoint không qua validator~~ **→ ĐÃ GIẢI QUYẾT một phần 2026-10-24:** thêm validator `limit` cho `GET /api/products/featured` (1–50). Các GET còn lại (`/categories/tree`, `/attributes`, `/cart`, `/wishlist`...) không có input nên không cần validator.
5. `.env.example` thiếu `JWT_SECRET`, `JWT_EXPIRES_IN`, `MAIL_*`, `CLOUDINARY_*`, `GEMINI_*`, `ADMIN_NAME/EMAIL/PASSWORD` (create-admin); dòng `OPENAI_API_KEY=OPENAI_API_KEY=...` viết sai đôi key.

### 7.5 Rủi ro khác đã nêu rải rác: CORS mở (**→ đã fix 2026-10-24**: whitelist từ `CLIENT_URL`), JWT không check status, OTP RAM, regex search coupon không escape (**→ đã fix 2026-10-24**), Cloudinary không có hàm delete (asset mồ côi), 4 script test mới quên `mongoose.disconnect()` (**→ đã fix 2026-10-24**), checkout trừ kho không atomic (**→ đã fix 2026-10-24**: `$inc` kèm điều kiện `$gte` chống âm kho), `npm test` thiếu `test:payment` (**→ đã fix 2026-10-24**), README root thư mục DATABASE ảo (**→ đã fix 2026-10-24**), `main: index.js` sai (**→ đã fix 2026-10-24**).

### 7.6 Câu hỏi mở cho chủ dự án (không thể trả lời từ code)

> **CHỐT 2026-10-24** — chủ dự án đã trả lời:

1. **MoMo/ZaloPay: CHƯA LÀM XONG** — giữ nguyên stub, chờ đưa cấu hình gateway vào. Tài liệu Payment sẽ ghi rõ các phương thức này "chưa kích hoạt" (chỉ VNPay và `PAYMENT_ENV=mock` có luồng tạo URL thật).
2. **`shippingFee` do client gửi lên từ checkout: NGHIỆP VỤ CHẤP NHẬN** — admin sẽ cấu hình phí ship (tính năng cấu hình phí, làm sau). Tài liệu ghi rõ: server tin `shippingFee` từ request; backend không có bảng phí.
3. **Admin hủy đơn đã paid: ĐÃ TRIỂN KHAI PHƯƠNG ÁN (c) 2026-10-24** — tự động hoàn tiền đầy đủ qua hàm refund dùng chung: tách `markPaymentRefunded` (nội bộ `payment.service.ts`) + export `refundPaidPaymentForOrder(orderId, reason)`; `updateOrderStatusAdmin` giờ ở nhánh `cancelled` **và** `returned` đều gọi hàm này khi `paymentStatus=paid` — sửa luôn bất đối xứng cũ của `returned` (trước đây chỉ sửa Order, không ghi bản ghi Payment). `refundPaymentAdmin` (API refund thủ công) dùng chung hàm mutation. Test `test-order.ts` thêm case "Admin hủy đơn paid → refund tự động (Order + Payment)" và mở rộng case returned kiểm tra Payment record.
4. **COD: GHI NHẬN TIỀN TẠI `delivered`** (`completed` = khách xác nhận hoàn tất, không có vấn đề). Đã triển khai 2026-10-24: `updateOrderStatusAdmin` gọi `recordCodPayment` khi vào `delivered` (giữ nhánh `completed` cho đường rút ngắn shipping→completed; idempotent nên không ghi trùng). Test `test-order.ts` cập nhật: expected `paymentStatus=paid` ngay tại delivered.
5. OTP trong RAM: **GIỮ NGUYÊN** — không phải phần của chủ dự án làm (đồng bộ quyết định C3).
6. AI endpoints public / không rate-limit: **GIỮ NGUYÊN** — không phải phần của chủ dự án làm.
7. Model Announcement/Notification/Chat: **GIỮ NGUYÊN** — không phải phần của chủ dự án làm.

---

## 8. Kế hoạch triển khai tài liệu API theo module (đề xuất Phase 2+)

Nguyên tắc chung: nguồn chân xác **luôn là code**; PROMPT/EVIDENCE chỉ dùng làm cross-check và ghi chú "đã kiểm chứng bằng test". Mỗi module nên có: tổng quan nghiệp vụ, bảng endpoint (từ API_CATALOG), request/response schema thực tế (bắt từ controller/service, không suy diễn), mã lỗi theo đúng pattern của module đó, ví dụ curl, và mục "Điểm khác thường".

| Thứ tự | Module | Lý do ưu tiên | Việc cần làm thêm khi viết |
|---|---|---|---|
| 1 | Auth (customer + admin) | Mọi client cần trước tiên; không có EVIDENCE | Truy vết 6.2; chạy script test mới; chốt quyết định OTP RAM |
| 2 | Catalog (category → brand → attribute → product → variant → media) | Nền cho mọi module; evidence tốt nhất | Ghi delete-guard, sync min/max price, primary-media rules |
| 3 | Cart + Wishlist + Address | Phụ thuộc catalog; đơn giản | Ghi số ảo 9999, ownership |
| 4 | Coupon | Có 7 luật validate phức tạp | Bảng quyết định validate + công thức giảm giá + rollback |
| 5 | Checkout + Order + OrderItem + Payment | Phức tạp nhất, nhiều CONFLICT | Truy vết 6.1; quyết D3/D4 (MoMo/ZaloPay, refund); vẽ state machine + sơ đồ thời gian; bảng mã lỗi IPN từng gateway |
| 6 | Statistics + Admin Customers | Nhỏ | Sửa/ghi chú bug C2 trước khi đóng băng tài liệu |
| 7 | AI (search + chat) | Không có test; response thực tế UNKNOWN | Truy vết 6.4 với API key thật, ghi schema response chuẩn + hành vi lỗi |
| 8 | Phụ lục: health, envelope chuẩn, phân trang, auth header, env vars | Cross-cutting | Đồng bộ từ §4.2, §5, API_CATALOG phụ lục B |

Định dạng đề xuất: bắt đầu bằng OpenAPI 3.1 (tạo được playground Postman/Swagger UI và đối chiếu tự động với code sau này) + bản đọc nhanh theo module bằng Markdown; giữ nhãn VERIFIED/… trên từng endpoint như API_CATALOG đang dùng.

---

## Phạm vi đã kiểm tra / chưa kiểm tra

**Đã kiểm tra (đọc toàn văn):** `app.ts`, `server.ts`; 24/24 route files; 5/5 middleware; `utils/jwt.ts`; 25/26 model (AIConversation đọc qua inventory; chưa đọc nguyên văn từng dòng); 22 controller files (qua agent, có kiểm tra chéo điểm nghi vấn bằng grep); 25 service + 6 config files (qua agent, kiểm tra chéo coupon/OtpCode/dead-models bằng grep trực tiếp); `package.json`/`tsconfig`/`.env.example`; toàn bộ `DOCUMENT/` (27 file) và 18 `scripts/*.ts`; FRONT_END + ADMIN (tìm kiếm tiêu thụ API + cấu trúc route/mocks).

**Chưa kiểm tra / ngoài phạm vi:** (1) Dữ liệu thực trong MongoDB (server DB có thể đang chạy — không truy vấn để tránh ảnh hưởng; mọi kết luận về dữ liệu chỉ là suy ra từ code); (2) hành vi runtime thực của VNPay sandbox/MoMo/ZaloPay và Gemini (chỉ đọc code + EVIDENCE); (3) chi tiết byte-level của `dist/` (build lỗi thời, đã bỏ qua); (4) file `.docx` trong DOCUMENT (đọc bản .md tương ứng); (5) chưa chạy bất kỳ `npm run test:*` nào (audit chỉ đọc).

**Bước tiếp theo đề xuất:** (a) chốt 6 câu hỏi mở §7.6 với chủ dự án; (b) Phase 2 truy vết 6 luồng theo thứ tự §8; (c) song song đó quyết định số phận dead code (otp.controller, 7 model chết, openai config) trước khi viết tài liệu — tránh ghi tài liệu cho thứ không tồn tại hoặc sắp bị xóa; (d) cân nhắc thêm `test:payment` vào chuỗi `npm test`.
