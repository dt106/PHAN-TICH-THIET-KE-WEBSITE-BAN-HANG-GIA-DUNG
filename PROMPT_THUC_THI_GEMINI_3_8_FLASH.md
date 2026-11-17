# BỘ PROMPT THỰC THI THEO TỪNG ĐẦU MỤC CÔNG VIỆC (DÀNH CHO GEMINI 3.8 FLASH)
> **Dự án:** Phân tích & Thiết kế Website Bán Hàng Gia Dụng  
> **Căn cứ kế hoạch:** `KE_HOACH_CHI_TIET_TRIEN_KHAI_CHAT_CSKH.md`  
> **Đặc tả kỹ thuật:** `DOCS_HUONG_DAN_PHAT_TRIEN_CHAT_CSKH_CHO_FRONTEND.md`  
> **Phạm vi áp dụng:** Lấy Admin làm gốc, đấu nối API Admin thật, kiểm thử tự động API Khách hàng (Không bao gồm thiết kế UI Front-end khách hàng)  

---

## HƯỚNG DẪN SỬ DỤNG BỘ PROMPT
Tệp này bao gồm **6 Sub-Prompt độc lập**. Mỗi Sub-Prompt đại diện cho **đúng 1 đầu mục công việc cụ thể**. 
- Khi thực thi, bạn (Gemini 3.8 Flash) phải hoàn thành trọn vẹn từng Sub-Prompt, kiểm tra biên dịch (`typecheck`), đánh dấu vào bảng Checklist của Sub-Prompt đó trước khi chuyển sang Sub-Prompt tiếp theo.
- Tuyệt đối không gộp nhiều Sub-Prompt làm cùng lúc để đảm bảo kiểm soát chất lượng và tránh lỗi dây chuyền.

---

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DANH SÁCH 6 SUB-PROMPT CÔNG VIỆC                         │
└─────────────────────────────────────────────────────────────────────────────┘
  [SUB-PROMPT 1] Seed Data & Dữ liệu mẫu kiểm thử trong Database
       │
       ▼
  [SUB-PROMPT 2] Đấu nối Load Danh sách, Thống kê 4 KPIs & Phân công Admin
       │
       ▼
  [SUB-PROMPT 3] Đấu nối Xem tin nhắn, Đánh dấu đọc & Gửi tin phản hồi Admin
       │
       ▼
  [SUB-PROMPT 4] Đấu nối Bàn giao ca & Đóng/Mở hội thoại kèm Tin hệ thống
       │
       ▼
  [SUB-PROMPT 5] Kịch bản Kiểm thử Tự động Backend API Khách hàng
       │
       ▼
  [SUB-PROMPT 6] Kiểm tra Biên dịch Toàn hệ thống & Báo cáo Nghiệm thu
```

---

## SUB-PROMPT 1: KHỞI TẠO SEED DATA & DỮ LIỆU MẪU KIỂM THỬ TRONG DATABASE

### 1. Mục tiêu công việc
Tạo kịch bản nạp dữ liệu mẫu vào MongoDB để khi khởi động máy chủ Backend, hệ thống đã có sẵn 4 cuộc hội thoại bao quát toàn bộ các trạng thái và trường hợp nghiệp vụ, phục vụ trực tiếp cho việc đấu nối giao diện Admin.

### 2. Phạm vi tệp tin
- **Tệp cần đọc tham chiếu:**
  - `BACK_END/src/models/Conversation.model.ts`
  - `BACK_END/src/models/Message.model.ts`
  - `BACK_END/src/models/User.model.ts`
- **Tệp cần tạo mới:**
  - `BACK_END/scripts/seed-conversations.ts`

### 3. Hướng dẫn thực thi chi tiết
1. Tạo tệp `BACK_END/scripts/seed-conversations.ts` kết nối tới MongoDB qua chuỗi kết nối từ file `.env` hoặc mặc định `mongodb://localhost:27017/ban_hang_gia_dung` (sử dụng cấu hình từ `src/config/database.ts`).
2. Tìm hoặc tạo sẵn 1 tài khoản Customer mẫu và 2 tài khoản Admin mẫu (`Admin` và `Nhân viên CSKH`).
3. Khởi tạo 4 cuộc hội thoại mẫu với dữ liệu bao quát:
   - **Hội thoại 1 (`pending` - Chờ tiếp nhận):**
     - `subject`: "Tư vấn nồi chiên không dầu 5L"
     - `status`: `'pending'`, `assignedAdminId: null`, `adminUnreadCount: 1`, `customerUnreadCount: 0`.
     - 1 tin nhắn do khách gửi: *"Dung tích 5 lít có phù hợp cho gia đình 4 người không shop?"*.
   - **Hội thoại 2 (`open` - Đang xử lý):**
     - `subject`: "Hỏi về tình trạng giao hàng đơn #1024"
     - `status`: `'open'`, `assignedAdminId`: Admin 1, `adminUnreadCount: 0`, `customerUnreadCount: 0`.
     - Lịch sử 3 tin nhắn: Khách hỏi ➔ Admin trả lời ➔ Khách gửi lời cảm ơn.
   - **Hội thoại 3 (`open` - Đang xử lý, có bàn giao ca):**
     - `subject`: "Yêu cầu đổi trả máy xay sinh tố bị vỡ nắp"
     - `status`: `'open'`, `assignedAdminId`: Admin 2.
     - Lịch sử tin nhắn kèm 1 tin nhắn hệ thống (`messageType: 'system'`): *"Quản trị viên Admin đã bàn giao cuộc hội thoại cho Nhân viên CSKH."*.
   - **Hội thoại 4 (`closed` - Đã đóng):**
     - `subject`: "Chính sách bảo hành chảo chống dính"
     - `status`: `'closed'`, `assignedAdminId`: Admin 1.
     - Lịch sử tin nhắn kết thúc bằng 1 tin nhắn hệ thống: *"Hội thoại đã được đóng bởi Admin."*.
4. Cung cấp lệnh thực thi chạy seed: `npx ts-node BACK_END/scripts/seed-conversations.ts`.

### 4. Ràng buộc kỹ thuật
- Tự động xóa dữ liệu hội thoại mẫu cũ trước khi nạp lại để tránh trùng lặp.
- Các trường `lastMessageAt`, `lastMessagePreview` trên bảng `Conversation` phải khớp chuẩn với tin nhắn cuối cùng trong bảng `Message`.

### 5. Checklist tự đối soát của AI cho Sub-Prompt 1
- [x] Tệp `BACK_END/scripts/seed-conversations.ts` đã được tạo và không có lỗi cú pháp.
- [x] Đã bao quát đủ 4 trạng thái: 1 ca `pending`, 2 ca `open` (1 ca đã bàn giao), 1 ca `closed`.
- [x] Đã có đủ các loại tin nhắn: `text` và `system`.
- [x] Đã kiểm tra biên dịch bằng lệnh: `npx tsc --noEmit BACK_END/scripts/seed-conversations.ts --skipLibCheck`.

---

## SUB-PROMPT 2: ĐẤU NỐI LOAD DANH SÁCH, THỐNG KÊ 4 KPIS & PHÂN CÔNG ADMIN

### 1. Mục tiêu công việc
Thay thế việc đọc Mock Data tĩnh trong RAM tại `ADMIN/src/pages/conversations/ConversationsPage.tsx` bằng việc gọi API Backend thật để nạp danh sách hội thoại, 4 thẻ thống kê Dashboard và danh sách nhân viên CSKH.

### 2. Phạm vi tệp tin
- **Tệp cần đọc tham chiếu:**
  - `ADMIN/src/services/conversations/conversations.service.ts`
  - `ADMIN/src/types/conversation.types.ts`
  - `ADMIN/src/mocks/conversations.mock.ts` (dùng làm dữ liệu fallback)
- **Tệp cần chỉnh sửa:**
  - `ADMIN/src/pages/conversations/ConversationsPage.tsx`

### 3. Hướng dẫn thực thi chi tiết
1. Trong `ConversationsPage.tsx`, import `conversationsService` từ `../../services/conversations/conversations.service`.
2. Khai báo các state bổ sung:
   ```typescript
   const [loading, setLoading] = useState(false);
   const [assignees, setAssignees] = useState<{ id: string | number; name: string }[]>([]);
   const [kpiStats, setKpiStats] = useState({ total: 0, open: 0, pending: 0, unread: 0 });
   ```
3. Tạo hàm `fetchConversationsData` bọc trong `useEffect` khi mount hoặc khi `search`/`statusFilter` thay đổi:
   - Gọi song song `conversationsService.getStatistics()` và `conversationsService.getConversations({ status: statusFilter, keyword: search })`.
   - Nếu gọi API thành công: Cập nhật `conversations` và `kpiStats`. Tự động chọn `selectedId` là phần tử đầu tiên nếu chưa chọn.
   - Nếu gọi API thất bại: Giữ nguyên mock data làm fallback, không làm gián đoạn hiển thị.
4. Gọi `conversationsService.getAssignees()` khi mount trang để nạp danh sách nhân viên vào state `assignees` (truyền xuống component chat).
5. Hiển thị 4 thẻ KPI dựa trên dữ liệu thật `kpiStats` (Tổng hội thoại, Đang xử lý, Chờ tiếp nhận, Tin chưa đọc).

### 4. Ràng buộc kỹ thuật
- Giữ nguyên toàn bộ cấu trúc Tailwind CSS của 4 thẻ KPI và bảng phân bố 2 cột.
- Bọc toàn bộ các hàm gọi API trong khối `try/catch`.
- Tương thích cả ID kiểu chuỗi (MongoID) lẫn số nguyên (Mock ID).

### 5. Checklist tự đối soát của AI cho Sub-Prompt 2
- [x] `ConversationsPage.tsx` đã nạp danh sách hội thoại từ API `conversationsService.getConversations`.
- [x] 4 thẻ KPI đã lấy dữ liệu từ API `conversationsService.getStatistics`.
- [x] Dropdown nhân viên đã nạp từ API `conversationsService.getAssignees`.
- [x] Đã có khối `try/catch` fallback dữ liệu an toàn.
- [x] Đã kiểm tra biên dịch bằng lệnh: `npx tsc --noEmit --project ADMIN/tsconfig.app.json`.

---

## SUB-PROMPT 3: ĐẤU NỐI XEM TIN NHẮN, ĐÁNH DẤU ĐỌC & GỬI TIN PHẢN HỒI ADMIN

### 1. Mục tiêu công việc
Đấu nối API để Admin xem lịch sử tin nhắn thực tế từ MongoDB, tự động xóa số tin chưa đọc khi mở xem ca, và gửi tin nhắn phản hồi lưu trực tiếp vào cơ sở dữ liệu.

### 2. Phạm vi tệp tin
- **Tệp cần chỉnh sửa:**
  - `ADMIN/src/pages/conversations/ConversationsPage.tsx`
  - `ADMIN/src/pages/conversations/components/ConversationChat.tsx`

### 3. Hướng dẫn thực thi chi tiết
1. **Xử lý chọn hội thoại & Xem tin nhắn:**
   - Trong `ConversationsPage.tsx`, khi `selectedId` thay đổi hoặc khi hàm `handleSelectConversation` được kích hoạt:
   - Gọi API `conversationsService.getConversationMessages(conversation.id)`. Khi có kết quả, cập nhật vào state `messages`.
   - Gọi API `conversationsService.markRead(conversation.id)` để reset `admin_unread_count` trên server về 0.
   - Cập nhật state cục bộ: Reset badge số tin chưa đọc của cuộc hội thoại đó về 0.
2. **Xử lý gửi tin nhắn phản hồi (`handleSendMessage`):**
   - Trong `handleSendMessage(content: string)`:
   - Gọi API `conversationsService.sendMessage(selectedConversation.id, { content, messageType: 'text' })`.
   - Khi API trả về tin nhắn mới tạo:
     + Nối tin nhắn mới vào state `messages`.
     + Cập nhật cuộc hội thoại trong danh sách `conversations`: Cập nhật `last_message_preview = content`, `last_message_at = now`, chuyển `status = 'open'` nếu trước đó là `pending`.
     + Nếu trước đó chưa ai nhận ca, tự động gán Admin hiện tại làm người phụ trách.
   - Hiển thị thông báo nhỏ nếu gửi tin nhắn thất bại.

### 4. Ràng buộc kỹ thuật
- Đảm bảo bong bóng chat căn lề đúng: Tin Admin gửi căn phải màu vàng đồng (`accent-primary`), tin khách gửi căn trái nền trắng/xám.
- Tự động cuộn xuống tin nhắn mới nhất sau khi gửi thành công.

### 5. Checklist tự đối soát của AI cho Sub-Prompt 3
- [x] Click chọn hội thoại đã gọi API `getConversationMessages` và tải tin nhắn từ DB.
- [x] Đã tự động gọi API `markRead` để xóa số tin chưa đọc.
- [x] Gửi tin nhắn phản hồi đã gọi API `sendMessage` và lưu thành công vào MongoDB.
- [x] Trạng thái cuộc hội thoại tự động chuyển sang `open` khi Admin trả lời ca `pending`.
- [x] Đã kiểm tra biên dịch bằng lệnh: `npx tsc --noEmit --project ADMIN/tsconfig.app.json`.

---

## SUB-PROMPT 4: ĐẤU NỐI BÀN GIAO CA & ĐÓNG/MỞ HỘI THOẠI KÈM TIN HỆ THỐNG

### 1. Mục tiêu công việc
Đấu nối nghiệp vụ phân công/bàn giao nhân viên CSKH và thay đổi trạng thái đóng/mở hội thoại, đảm bảo tin nhắn hệ thống (`system message`) sinh ra từ server được hiển thị ngay lập tức trên khung chat.

### 2. Phạm vi tệp tin
- **Tệp cần chỉnh sửa:**
  - `ADMIN/src/pages/conversations/ConversationsPage.tsx`
  - `ADMIN/src/pages/conversations/components/ConversationChat.tsx`

### 3. Hướng dẫn thực thi chi tiết
1. **Đấu nối phân công / bàn giao ca (`handleAssignAdmin`):**
   - Trong `ConversationsPage.tsx`, khi Admin chọn nhân viên từ dropdown "Phân công cho":
   - Gọi API `conversationsService.assignAdmin(selectedConversation.id, adminId)`.
   - Server trả về `{ conversation, systemMessage }`.
   - Cập nhật lại `assigned_admin_id` và `assigned_admin_name` trong danh sách `conversations`.
   - Đẩy `systemMessage` trả về vào mảng `messages` để khung chat lập tức hiện thông báo bàn giao (ví dụ: *"Quản trị viên Admin đã bàn giao hội thoại cho Nhân viên CSKH"*).
2. **Đấu nối Đóng / Mở lại hội thoại (`handleToggleStatus`):**
   - Khi Admin bấm nút "Đóng hội thoại" hoặc "Mở lại":
   - Xác định `nextStatus = selectedConversation.status === 'closed' ? 'open' : 'closed'`.
   - Gọi API `conversationsService.updateStatus(selectedConversation.id, nextStatus)`.
   - Server trả về `{ conversation, systemMessage }`.
   - Cập nhật `status = nextStatus` trong danh sách `conversations`.
   - Đẩy `systemMessage` trả về vào danh sách tin nhắn để hiển thị thông báo ca đã đóng hoặc mở lại.
   - **Khóa giao diện:** Khi trạng thái là `closed`, ô nhập tin nhắn trong `ConversationChat.tsx` tự động bị khóa và thay bằng dòng thông báo *"Hội thoại đã đóng. Mở lại để tiếp tục trả lời khách hàng."*.

### 4. Ràng buộc kỹ thuật
- Tin nhắn hệ thống (`messageType === 'system'`) phải được hiển thị chính giữa khung chat, chữ nhỏ, màu xám nhạt (`italic text-text-muted`), phân biệt rõ với tin nhắn người chat.
- Khi hội thoại bị đóng, nút gửi tin nhắn và khung soạn thảo phải bị vô hiệu hóa hoàn toàn (`disabled`).

### 5. Checklist tự đối soát của AI cho Sub-Prompt 4
- [x] Chọn nhân viên phân công đã gọi API `assignAdmin` và lưu vào MongoDB.
- [x] Tin nhắn hệ thống ghi nhận bàn giao hiển thị chính xác trên khung chat.
- [x] Bấm Đóng / Mở lại đã gọi API `updateStatus`.
- [x] Khung soạn thảo tin nhắn bị khóa khi hội thoại ở trạng thái `closed`.
- [x] Tin nhắn hệ thống ghi nhận đóng/mở hiển thị chính xác.
- [x] Đã kiểm tra biên dịch bằng lệnh: `npx tsc --noEmit --project ADMIN/tsconfig.app.json`.

---

## SUB-PROMPT 5: XÂY DỰNG KỊCH BẢN KIỂM THỬ TỰ ĐỘNG BACKEND API KHÁCH HÀNG

### 1. Mục tiêu công việc
Vì không nằm trong phạm vi thiết kế UI Front-end khách hàng, bạn cần xây dựng một kịch bản kiểm thử tự động (Integration Test Suite) đóng vai Khách hàng gọi vào toàn bộ các API `/api/customer/conversations` để kiểm chứng logic Backend hoạt động chính xác 100% trước khi bàn giao cho đội ngũ Front-end.

### 2. Phạm vi tệp tin
- **Tệp cần tạo mới:**
  - `BACK_END/scripts/test-customer-conversation-flow.ts`

### 3. Hướng dẫn thực thi chi tiết
1. Tạo file `BACK_END/scripts/test-customer-conversation-flow.ts`.
2. Viết kịch bản tự động thực hiện tuần tự 6 ca kiểm thử (Test Cases):
   - **Case 1 (Tạo ca mới):** Khách hàng tạo cuộc hội thoại mới với `firstMessage = "Shop ơi nồi chiên có bảo hành không ạ?"`.
     * *Kiểm tra:* Trạng thái trả về là `201`, `conversation.status === 'pending'`, `adminUnreadCount === 1`.
   - **Case 2 (Lấy ca hiện tại):** Khách hàng gọi `GET /api/customer/conversations/current`.
     * *Kiểm tra:* Trả về đúng ID của cuộc hội thoại vừa tạo.
   - **Case 3 (Lấy danh sách tin nhắn):** Khách hàng gọi `GET /api/customer/conversations/:id/messages`.
     * *Kiểm tra:* Trả về mảng tin nhắn chứa đúng tin nhắn đầu tiên.
   - **Case 4 (Khách gửi thêm tin nhắn):** Khách hàng gửi tin nhắn thứ 2: *"Shop ship hỏa tốc được không?"*.
     * *Kiểm tra:* `adminUnreadCount` tăng lên 2.
   - **Case 5 (Kiểm tra cơ chế Re-open tự động):**
     * Admin đóng cuộc hội thoại (`status = 'closed'`).
     * Khách hàng gửi tin nhắn mới: *"Em muốn hỏi thêm về quà tặng kèm ạ"*.
     * *Kiểm tra:* Trạng thái cuộc hội thoại tự động chuyển từ `closed` sang `open` (hoặc `pending`), `adminUnreadCount` tiếp tục tăng, có sinh tin nhắn hệ thống tái mở ca.
   - **Case 6 (Đánh dấu đã đọc):** Khách hàng gọi `PATCH /api/customer/conversations/:id/read`.
     * *Kiểm tra:* `customerUnreadCount` được reset về 0.
3. Chạy kịch bản và in kết quả chi tiết từng ca kiểm thử ra terminal (`[PASS]` / `[FAIL]`).

### 4. Ràng buộc kỹ thuật
- Kịch bản chạy độc lập thông qua `npx ts-node BACK_END/scripts/test-customer-conversation-flow.ts`.
- Sử dụng trực tiếp model Mongoose hoặc thư viện HTTP call tới server nội bộ để kiểm tra.
- Dọn dẹp dữ liệu kiểm thử sau khi hoàn thành để không làm bẩn DB.

### 5. Checklist tự đối soát của AI cho Sub-Prompt 5
- [x] Tệp `test-customer-conversation-flow.ts` đã được tạo và không có lỗi cú pháp.
- [x] Bao quát đủ 6 ca kiểm thử (Tạo ca, Lấy current, Gửi tin, Đếm tin chưa đọc, Re-open khi đóng, Đánh dấu đọc).
- [x] Chạy kịch bản kiểm thử và đạt kết quả **100% PASS**.
- [x] Đã kiểm tra biên dịch bằng lệnh: `npx tsc --noEmit BACK_END/scripts/test-customer-conversation-flow.ts --skipLibCheck`.

---

## SUB-PROMPT 6: KIỂM TRA BIÊN DỊCH TOÀN HỆ THỐNG & BÁO CÁO NGHIỆM THU

### 1. Mục tiêu công việc
Thực hiện rà soát tổng thể toàn bộ các tệp tin đã tạo và chỉnh sửa, chạy kiểm tra biên dịch TypeScript trên cả Backend và Admin, đối soát bảng Master Checklist và lập báo cáo nghiệm thu kỹ thuật chi tiết.

### 2. Các lệnh kiểm tra biên dịch bắt buộc
1. Kiểm tra Backend:
   ```powershell
   npx tsc --noEmit BACK_END/src/controllers/admin/admin.conversation.controller.ts BACK_END/src/controllers/customer/customer.conversation.controller.ts BACK_END/src/services/admin/admin.conversation.service.ts BACK_END/src/services/customer/customer.conversation.service.ts BACK_END/src/routes/admin/admin.conversation.routes.ts BACK_END/src/routes/customer/customer.conversation.routes.ts BACK_END/src/validators/admin/admin.conversation.validator.ts BACK_END/src/validators/customer/customer.conversation.validator.ts --skipLibCheck
   ```
2. Kiểm tra Admin:
   ```powershell
   npx tsc --noEmit --project ADMIN/tsconfig.app.json
   ```

### 3. Cấu trúc báo cáo nghiệm thu bắt buộc
Báo cáo lại cho người dùng theo đúng khung mẫu sau:
```markdown
# BÁO CÁO NGHIỆM THU HOÀN TẤT TRIỂN KHAI PHÂN HỆ CHAT CSKH

## 1. Danh sách công việc đã thực hiện thành công:
- [x] Sub-Prompt 1: Khởi tạo Seed Data hội thoại mẫu vào MongoDB.
- [x] Sub-Prompt 2: Đấu nối API nạp danh sách, 4 thẻ KPI và nhân viên phân công.
- [x] Sub-Prompt 3: Đấu nối API xem tin nhắn, đánh dấu đọc và gửi tin phản hồi.
- [x] Sub-Prompt 4: Đấu nối API bàn giao ca và đóng/mở hội thoại kèm tin hệ thống.
- [x] Sub-Prompt 5: Xây dựng kịch bản kiểm thử tự động API Khách hàng (100% PASS).
- [x] Sub-Prompt 6: Rà soát biên dịch TypeScript sạch lỗi toàn hệ thống.

## 2. Danh sách tệp tin đã tác động:
- [Tệp đã sửa]: Liệt kê các tệp đã sửa đổi kèm chức năng
- [Tệp đã tạo mới]: Liệt kê các script seed, test và tài liệu

## 3. Kết quả xác minh chất lượng:
- Biên dịch TypeScript Backend: 0 lỗi.
- Biên dịch TypeScript Admin: 0 lỗi.
- Trạng thái vòng đời hội thoại: Đạt chuẩn 100% theo đúng luồng Admin thiết kế.
```

### 4. Checklist tự đối soát của AI cho Sub-Prompt 6
- [x] Đã chạy kiểm tra TypeScript trên tất cả các tệp liên quan và đạt **0 lỗi**.
- [x] Đã hoàn thành đầy đủ báo cáo nghiệm thu theo đúng mẫu quy định.
