# PHÂN TÍCH - THIẾT KẾ WEBSITE BÁN HÀNG GIA DỤNG

Cửa hàng gia dụng: `FRONT_END` (khách), `ADMIN` (quản trị), `BACK_END` (API Express + MongoDB).

## 1. Công nghệ

| Phần | Stack |
|------|--------|
| Frontend / Admin | React, TypeScript, Vite, Tailwind, React Router |
| Backend | Node.js, Express, TypeScript, Mongoose, JWT |
| Database | MongoDB (local hoặc Atlas) |

## 2. Cấu trúc

```text
├── ADMIN/        # Panel quản trị
├── FRONT_END/    # Website bán hàng (cổng 3000)
├── BACK_END/     # API (mặc định cổng 5000)
└── README.md
```

## 3. Yêu cầu máy local

- Node.js **20+** và npm
- MongoDB lắng nghe `127.0.0.1:27017` (MongoDB Compass tùy chọn)

Kiểm tra nhanh:

```bash
node -v
npm -v
mongosh --eval "db.runCommand({ ping: 1 })"
```

## 4. Cấu hình Backend (`.env`)

```bash
cd BACK_END
cp .env.example .env
```

**Không commit** file `.env`. Điền tối thiểu:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/BAN_HANG_GIA_DUNG
DOCUMENT_PATH=./DOCUMENT
PAYMENT_ENV=mock
CLIENT_URL=http://localhost:3000
JWT_SECRET=dev-local-gia-dung-change-me
JWT_EXPIRES_IN=7d
```

Ghi chú:

- **JWT_SECRET** bắt buộc; thiếu sẽ lỗi đăng nhập.
- **PAYMENT_ENV=mock**: thanh toán MoMo chạy trang giả lập trên web, không cần cổng MoMo thật.
- Để trống `MAIL_*`: OTP đăng ký / quên mật khẩu **in ra log backend** (dòng `OTP:`).
- Để trống / placeholder Cloudinary: ảnh đại diện lưu local tại `BACK_END/DOCUMENT/uploads` và phục vụ qua `/uploads`.
- Để trống `GEMINI_API_KEY`: trang tư vấn AI báo thiếu key (không chặn mua hàng).

### Cổng 5000 bị chiếm (macOS AirPlay)

Đổi `PORT=5001` trong `.env`, đồng thời proxy Vite:

- `FRONT_END/vite.config.ts` → `"/api"` và `"/uploads"` trỏ `http://localhost:5001`
- `ADMIN/vite.config.ts` tương tự

## 5. Chạy dự án

Mở **3 terminal** (thứ tự: MongoDB đã chạy → Backend → Frontend / Admin).

### Backend

```bash
cd BACK_END
npm install
npm run seed:store    # nạp danh mục, thương hiệu, ~23 SP, mã GIADUNG10 / GIAM50K / FREESHIP
npm run dev
```

Log cần có `MongoDB connected` và `http://localhost:5000` (hoặc 5001).

Seed **chạy lại được** (cập nhật theo slug/SKU/mã, không tạo bản trùng vô hạn).

### Frontend (cửa hàng)

```bash
cd FRONT_END
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000). Vite proxy `/api` và `/uploads` sang backend.

### Admin

```bash
cd ADMIN
npm install
npm run dev
```

## 6. Thanh toán (storefront)

Chỉ còn **2 phương thức** trên web khách:

1. **Thanh toán khi nhận hàng (COD)**
2. **Ví MoMo**

| `PAYMENT_ENV` | Hành vi |
|---------------|---------|
| `mock` | Sau khi đặt MoMo → trang `/payment/momo` (demo local) → xác nhận / hủy |
| `sandbox` | Gọi API MoMo thật (`test-payment.momo.vn`). Cần `MOMO_ACCESS_KEY` / `MOMO_SECRET_KEY`. Mạng máy phải gọi được endpoint MoMo |

Thanh toán lại: chi tiết đơn hoặc mục **Tài khoản → Thanh toán của tôi**.

## 7. Dữ liệu MongoDB — có đẩy lên Git không?

**Không.** MongoDB nằm trên máy (hoặc Atlas), **không** nằm trong repo.

| Đẩy lên GitHub | Không đẩy |
|----------------|-----------|
| Source code, script `seed:store` | Nội dung database (user, đơn, thanh toán) |
| `.env.example` | File `.env` |
| | Ảnh trong `BACK_END/DOCUMENT/` |

Máy mới / clone mới:

1. Cài & chạy MongoDB  
2. Copy `.env`  
3. `npm run seed:store` → có lại catalog mẫu  
4. Đăng ký tài khoản mới (hoặc tự seed admin theo biến `ADMIN_*` trong `.env` nếu có)

Muốn mang data thật sang máy khác: dùng `mongodump` / `mongorestore` (hoặc Compass export), không dùng `git push`.

## 8. Kiểm tra nhanh sau khi chạy

- `GET http://localhost:5000/` → `success: true`
- Trang chủ có danh mục / sản phẩm
- `/shop?q=nồi` có kết quả
- Đăng ký tại `/login`: lấy OTP trong log backend; mật khẩu ≥ 8 ký tự (hoa, thường, số, ký tự đặc biệt)
- Checkout với mã `GIADUNG10`

## 9. Git

Không commit:

```text
node_modules/
.env
dist/
BACK_END/DOCUMENT/
```
