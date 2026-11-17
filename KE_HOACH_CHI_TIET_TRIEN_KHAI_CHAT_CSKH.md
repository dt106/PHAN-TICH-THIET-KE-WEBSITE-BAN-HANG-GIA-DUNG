# KẾ HOẠCH TRIỂN KHAI TOÀN DIỆN PHÂN HỆ CHAT CHĂM SÓC KHÁCH HÀNG (CSKH)
> **Dự án:** Phân tích & Thiết kế Website Bán Hàng Gia Dụng  
> **Nguyên tắc cốt lõi:** Lấy luồng thiết kế Quản trị viên (`ADMIN`) làm gốc  
> **Phạm vi công việc:** Hoàn thiện toàn diện Backend API (Admin & Khách hàng), Đấu nối giao diện Quản trị (`ADMIN`), Kiểm thử tự động luồng khách hàng (Không bao gồm thiết kế giao diện UI Front-end khách hàng)  
> **Phiên bản:** 2.0 (Cập nhật chuẩn hóa theo phạm vi nghiệp vụ)  

---

## MỤC LỤC
1. [Mục tiêu & Giới hạn phạm vi (Scope Definition)](#1-mục-tiêu--giới-hạn-phạm-vi-scope-definition)
2. [Ma trận ánh xạ nghiệp vụ (Traceability Matrix)](#2-ma-trận-ánh-xạ-nghiệp-vụ-traceability-matrix)
3. [Phân rã các đầu mục công việc chi tiết (Work Breakdown Structure - WBS)](#3-phân-rã-các-đầu-mục-công-việc-chi-tiết-work-breakdown-structure---wbs)
   - [Đầu mục 1: Khởi tạo Seed Data & Dữ liệu mẫu kiểm thử trong Database](#đầu-mục-1-khởi-tạo-seed-data--dữ-liệu-mẫu-kiểm-thử-trong-database)
   - [Đầu mục 2: Đấu nối API Tải danh sách, Thống kê & Phân công Admin](#đầu-mục-2-đấu-nối-api-tải-danh-sách-thống-kê--phân-công-admin)
   - [Đầu mục 3: Đấu nối API Xem tin nhắn, Đánh dấu đọc & Gửi tin phản hồi Admin](#đầu-mục-3-đấu-nối-api-xem-tin-nhắn-đánh-dấu-đọc--gửi-tin-phản-hồi-admin)
   - [Đầu mục 4: Đấu nối API Bàn giao ca & Đóng/Mở hội thoại kèm Tin hệ thống](#đầu-mục-4-đấu-nối-api-bàn-giao-ca--đóngmở-hội-thoại-kèm-tin-hệ-thống)
   - [Đầu mục 5: Xây dựng Kịch bản Kiểm thử Tự động Backend API Khách hàng](#đầu-mục-5-xây-dựng-kịch-bản-kiểm-thử-tự-động-backend-api-khách-hàng)
   - [Đầu mục 6: Kiểm tra biên dịch hệ thống & Nghiệm thu toàn diện](#đầu-mục-6-kiểm-tra-biên-dịch-hệ-thống--nghiệm-thu-toàn-diện)
4. [Bảng kiểm tra kiểm soát tiến độ (Master Checklist)](#4-bảng-kiểm-tra-kiểm-soát-tiến-độ-master-checklist)
5. [Tiêu chuẩn hoàn thành (Definition of Done - DoD)](#5-tiêu-chuẩn-hoàn-thành-definition-of-done---dod)

---

## 1. MỤC TIÊU & GIỚI HẠN PHẠM VI (SCOPE DEFINITION)

### 1.1. Trong phạm vi thực hiện (In-Scope)
1. **Lấy Admin làm gốc:** Phục vụ đầy đủ và trọn vẹn luồng nghiệp vụ trên trang `ADMIN/src/pages/conversations` (4 thẻ KPI, danh sách hội thoại có tìm kiếm/lọc trạng thái, xem chi tiết tin nhắn, gửi tin phản hồi, phân công nhân viên, đóng/mở hội thoại, đánh dấu đã đọc).
2. **Loại bỏ Mock Data trên Admin:** Đấu nối trực tiếp React state của `ConversationsPage.tsx` với `conversationsService` đã kết nối Backend API thật.
3. **Logic Backend hoàn chỉnh:** Đã có 2 bộ route `/api/admin/conversations` và `/api/customer/conversations`, kèm các validator, controller, service xử lý cơ sở dữ liệu MongoDB.
4. **Kiểm thử tự động API Khách hàng:** Viết script kiểm thử mô phỏng toàn bộ luồng gửi nhận tin nhắn từ phía Khách hàng vào Backend mà không cần dựng UI.

### 1.2. Ngoài phạm vi thực hiện (Out-of-Scope)
- **Không thiết kế giao diện UI cho Front-end Khách hàng:** Phần dựng component HTML/CSS/React (Widget bong bóng chat) thuộc quyền phụ trách của nhân viên Front-end sau này; backend đã cung cấp đầy đủ tài liệu API tham chiếu tại [DOCS_HUONG_DAN_PHAT_TRIEN_CHAT_CSKH_CHO_FRONTEND.md](file:///c:/workspace/PHAN-TICH-THIET-KE-WEBSITE-BAN-HANG-GIA-DUNG/DOCS_HUONG_DAN_PHAT_TRIEN_CHAT_CSKH_CHO_FRONTEND.md).

---

## 2. MA TRẬN ÁNH XẠ NGHIỆP VỤ (TRACEABILITY MATRIX)

| Mã NV | Tên nghiệp vụ | Giao diện Quản trị (`ADMIN`) | Backend API Endpoint | Database Model & Logic |
| :---: | :--- | :--- | :--- | :--- |
| **NV-01** | Seed dữ liệu mẫu | Xem danh sách hội thoại có sẵn | Chạy script seed trực tiếp | Model `Conversation` & `Message` |
| **NV-02** | Xem 4 chỉ số KPI | 4 thẻ thống kê trên Dashboard | `GET /api/admin/conversations/statistics` | Đếm `status` & cộng tổng `adminUnreadCount` |
| **NV-03** | Tải danh sách hội thoại | `ConversationList` (lọc/tìm kiếm) | `GET /api/admin/conversations` | Query `Conversation`, sort `lastMessageAt desc` |
| **NV-04** | Tải nhân viên phân công | Dropdown "Phân công cho" | `GET /api/admin/conversations/assignees` | Query `User` có `role: 'admin'` |
| **NV-05** | Tải tin nhắn & Đánh dấu đọc | `ConversationChat` (vùng chat) | `GET /api/admin/conversations/:id/messages`<br>`PATCH /api/admin/conversations/:id/read` | Query `Message`, reset `adminUnreadCount = 0` |
| **NV-06** | Admin gửi tin phản hồi | Form soạn thảo tin nhắn | `POST /api/admin/conversations/:id/messages` | Lưu `Message`, tăng `customerUnreadCount + 1`, chuyển `status = 'open'` |
| **NV-07** | Phân công / Bàn giao ca | Dropdown chọn nhân viên | `PATCH /api/admin/conversations/:id/assign` | Cập nhật `assignedAdminId`, chèn `Message` (system) |
| **NV-08** | Đóng / Mở lại hội thoại | Nút "Đóng hội thoại" / "Mở lại" | `PATCH /api/admin/conversations/:id/status` | Đổi `status`, khóa input khi đóng, chèn `Message` (system) |
| **NV-09** | Luồng API Khách hàng | Script test tự động giả lập | `/api/customer/conversations/*` | Test tạo ca, gửi tin, tự động Re-open khi đóng |

---

## 3. PHÂN RÃ CÁC ĐẦU MỤC CÔNG VIỆC CHI TIẾT (WBS)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       6 ĐẦU MỤC CÔNG VIỆC TRIỂN KHAI                        │
└─────────────────────────────────────────────────────────────────────────────┘
  [Đầu mục 1] Seed Data & Môi trường DB
       │
       ▼
  [Đầu mục 2] Đấu nối Load Danh sách, Thống kê & Phân công Admin
       │
       ▼
  [Đầu mục 3] Đấu nối Xem tin nhắn, Đánh dấu đọc & Gửi tin phản hồi
       │
       ▼
  [Đầu mục 4] Đấu nối Bàn giao ca & Đóng/Mở hội thoại kèm Tin hệ thống
       │
       ▼
  [Đầu mục 5] Kịch bản Kiểm thử Tự động Backend API Khách hàng
       │
       ▼
  [Đầu mục 6] Kiểm tra Biên dịch & Nghiệm thu Toàn diện
```

---

### ĐẦU MỤC 1: KHỞI TẠO SEED DATA & DỮ LIỆU MẪU KIỂM THỬ TRONG DATABASE
- **Mục tiêu:** Tạo script nạp dữ liệu mẫu vào MongoDB để khi khởi động Backend, Admin có sẵn dữ liệu hội thoại thực tế để hiển thị thay vì DB trống rỗng.
- **Yêu cầu chi tiết:**
  - Viết file `BACK_END/scripts/seed-conversations.ts`.
  - Nạp ít nhất 4 cuộc hội thoại bao quát các trường hợp:
    1. Ca 1: `pending` (Chờ tiếp nhận), `assignedAdminId: null`, có tin nhắn từ khách hàng chưa đọc (`adminUnreadCount: 1`).
    2. Ca 2: `open` (Đang xử lý), đã phân công cho Admin, có lịch sử trao đổi qua lại giữa khách và shop.
    3. Ca 3: `open` (Đang xử lý), đã phân công cho Nhân viên CSKH, có tin nhắn hệ thống ghi nhận bàn giao.
    4. Ca 4: `closed` (Đã đóng), có tin nhắn hệ thống thông báo đóng cuộc hội thoại.
  - Chạy lệnh nạp dữ liệu thành công vào database.

---

### ĐẦU MỤC 2: ĐẤU NỐI API TẢI DANH SÁCH, THỐNG KÊ & PHÂN CÔNG ADMIN
- **Mục tiêu:** Đấu nối màn hình Admin để lấy dữ liệu thực tế từ server MongoDB.
- **Tệp tác động:** `ADMIN/src/pages/conversations/ConversationsPage.tsx`.
- **Yêu cầu chi tiết:**
  - Thay thế `useState(conversationsMock)` bằng state tải từ API qua `conversationsService.getConversations({ status, keyword })`.
  - Thay thế hàm tính `stats` cục bộ bằng API `conversationsService.getStatistics()` để hiển thị đúng 4 thẻ KPI: Tổng hội thoại, Đang xử lý, Chờ tiếp nhận, Tin chưa đọc.
  - Tải động danh sách nhân viên CSKH/Admin từ API `conversationsService.getAssignees()` đổ vào dropdown "Phân công cho".
  - Giữ cơ chế fallback an toàn: Nếu API chưa sẵn sàng hoặc lỗi kết nối, giữ lại mock data để giao diện không bị gián đoạn.

---

### ĐẦU MỤC 3: ĐẤU NỐI API XEM TIN NHẮN, ĐÁNH DẤU ĐỌC & GỬI TIN PHẢN HỒI ADMIN
- **Mục tiêu:** Cho phép Admin xem lịch sử tin nhắn thực tế và gửi tin phản hồi lưu vào DB.
- **Tệp tác động:** `ADMIN/src/pages/conversations/ConversationsPage.tsx`.
- **Yêu cầu chi tiết:**
  - Khi Admin nhấp chọn một cuộc hội thoại:
    - Gọi API `conversationsService.getConversationMessages(id)` để nạp tin nhắn từ DB.
    - Gọi API `conversationsService.markRead(id)` để reset số tin chưa đọc trên server về 0.
  - Khi Admin nhập nội dung vào ô trả lời và bấm "Gửi trả lời":
    - Gọi API `conversationsService.sendMessage(id, { content })`.
    - Đẩy tin nhắn mới vào danh sách tin nhắn hiển thị.
    - Cập nhật `last_message_preview` và đổi trạng thái hội thoại sang `open` nếu đang `pending`.

---

### ĐẦU MỤC 4: ĐẤU NỐI API BÀN GIAO CA & ĐÓNG/MỞ HỘI THOẠI KÈM TIN HỆ THỐNG
- **Mục tiêu:** Đấu nối nghiệp vụ phân công ca và vòng đời hội thoại trên giao diện Admin.
- **Tệp tác động:** `ADMIN/src/pages/conversations/ConversationsPage.tsx` và `ConversationChat.tsx`.
- **Yêu cầu chi tiết:**
  - **Phân công nhân viên:** Khi chọn nhân viên từ dropdown, gọi API `conversationsService.assignAdmin(id, adminId)`. Cập nhật tên người phụ trách và hiển thị ngay tin nhắn hệ thống bàn giao trả về từ server.
  - **Đóng / Mở lại hội thoại:** Khi bấm nút "Đóng hội thoại" hoặc "Mở lại", gọi API `conversationsService.updateStatus(id, nextStatus)`. Cập nhật trạng thái badge, khóa/mở khung soạn thảo tin nhắn, và hiển thị tin nhắn hệ thống ghi nhận đóng/mở.

---

### ĐẦU MỤC 5: XÂY DỰNG KỊCH BẢN KIỂM THỬ TỰ ĐỘNG BACKEND API KHÁCH HÀNG
- **Mục tiêu:** Kiểm chứng toàn bộ các API khách hàng (`/api/customer/conversations`) hoạt động chính xác 100% mà không cần dựng UI Front-end.
- **Tệp tác động:** `BACK_END/scripts/test-customer-conversation-flow.ts`.
- **Yêu cầu chi tiết:**
  - Viết kịch bản tự động kiểm tra lần lượt:
    1. Khách hàng tạo cuộc hội thoại mới với câu hỏi đầu tiên ➔ Kiểm tra DB tạo bản ghi `pending`, `adminUnreadCount = 1`.
    2. Khách hàng lấy cuộc hội thoại hiện tại (`GET /current`) ➔ Kiểm tra trả về đúng ca vừa tạo.
    3. Khách hàng lấy lịch sử tin nhắn (`GET /:id/messages`).
    4. Khách hàng gửi thêm tin nhắn (`POST /:id/messages`) ➔ Kiểm tra tin nhắn được lưu, tăng `adminUnreadCount`.
    5. Đóng cuộc hội thoại từ phía Admin, sau đó Khách hàng gửi tin nhắn mới ➔ Kiểm tra cơ chế tự động **Re-open** (trạng thái tự động mở lại sang `open`/`pending`).
    6. Khách hàng đánh dấu đã đọc (`PATCH /:id/read`) ➔ Kiểm tra `customerUnreadCount` được reset về 0.

---

### ĐẦU MỤC 6: KIỂM TRA BIÊN DỊCH HỆ THỐNG & NGHIỆM THU TOÀN DIỆN
- **Mục tiêu:** Đảm bảo hệ thống đạt độ ổn định tuyệt đối trước khi bàn giao.
- **Yêu cầu chi tiết:**
  - Chạy `npx tsc --noEmit` trên các tệp đã sửa đổi trong `BACK_END` và `ADMIN`.
  - Xác nhận **0 lỗi TypeScript**.
  - Tổng hợp báo cáo nghiệm thu theo tiêu chuẩn DoD.

---

## 4. BẢNG KIỂM TRA KIỂM SOÁT TIẾN ĐỘ (MASTER CHECKLIST)

```markdown
### MASTER CHECKLIST KIỂM SOÁT TIẾN ĐỘ THỰC THI

#### [Đầu mục 1] Seed Data & Môi trường DB
- [x] Đã tạo file `BACK_END/scripts/seed-conversations.ts`.
- [x] Đã nạp thành công 4 cuộc hội thoại mẫu (pending, open, closed, unread).
- [x] Đã có tin nhắn trao đổi mẫu và system message trong DB.

#### [Đầu mục 2] Đấu nối Load Danh sách, Thống kê & Phân công Admin
- [x] Đã thay thế state danh sách hội thoại bằng API `getConversations`.
- [x] Đã thay thế 4 thẻ KPI bằng API `getStatistics`.
- [x] Đã tải danh sách nhân viên bằng API `getAssignees`.
- [x] Đã có fallback dữ liệu an toàn nếu API lỗi.

#### [Đầu mục 3] Đấu nối Xem tin nhắn, Đánh dấu đọc & Gửi tin Admin
- [x] Đã tải tin nhắn thật từ DB bằng API `getConversationMessages`.
- [x] Đã tự động gọi API `markRead` khi mở xem ca hỗ trợ.
- [x] Đã gửi tin nhắn phản hồi vào DB bằng API `sendMessage`.
- [x] Đã tự động chuyển trạng thái `pending` sang `open` khi Admin trả lời.

#### [Đầu mục 4] Đấu nối Bàn giao ca & Đóng/Mở hội thoại
- [x] Đã gọi API `assignAdmin` khi chọn nhân viên từ dropdown.
- [x] Đã hiển thị tin nhắn hệ thống bàn giao trên khung chat.
- [x] Đã gọi API `updateStatus` khi bấm Đóng / Mở lại.
- [x] Đã khóa khung soạn thảo khi ca đã đóng và hiển thị tin nhắn hệ thống tương ứng.

#### [Đầu mục 5] Kịch bản Kiểm thử Tự động Backend API Khách hàng
- [x] Đã tạo script `BACK_END/scripts/test-customer-conversation-flow.ts`.
- [x] Chạy kiểm thử thành công: Khách tạo ca mới (`pending`).
- [x] Chạy kiểm thử thành công: Khách lấy ca hiện tại (`/current`).
- [x] Chạy kiểm thử thành công: Khách gửi tin nhắn và đếm unread count.
- [x] Chạy kiểm thử thành công: Cơ chế Re-open tự động khi khách nhắn vào ca đã đóng.
- [x] Chạy kiểm thử thành công: Khách đánh dấu đã đọc (`markRead`).

#### [Đầu mục 6] Kiểm tra Biên dịch & Nghiệm thu
- [x] Chạy kiểm tra TypeScript (`npx tsc --noEmit`) đạt **0 lỗi**.
- [x] Hoàn thành báo cáo nghiệm thu chi tiết.
```

---

## 5. TIÊU CHUẨN HOÀN THÀNH (DEFINITION OF DONE - DOD)

1. **Chuẩn hóa Logic:** Toàn bộ luồng thiết kế của Admin được tôn trọng và hoạt động trên dữ liệu thật từ MongoDB.
2. **Không lỗi biên dịch:** Toàn bộ mã nguồn TypeScript được kiểm tra nghiêm ngặt, không phát sinh cảnh báo lỗi cú pháp.
3. **Bảo toàn giao diện:** Không làm xáo trộn layout, CSS hoặc các tính năng khác trong Admin Portal.
4. **Sẵn sàng cho Front-end:** Backend API của Khách hàng đã được kiểm chứng 100% qua script kiểm thử tự động, sẵn sàng để lập trình viên Front-end sau này đấu nối giao diện một cách dễ dàng.
