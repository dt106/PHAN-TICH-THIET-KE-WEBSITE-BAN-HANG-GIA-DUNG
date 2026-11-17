# BÁO CÁO RÀ SOÁT LOGIC BACKEND: PHÂN HỆ HỘI THOẠI KHÁCH HÀNG (CSKH)

> File chi tiết đầy đủ xem tại: [BAO_CAO_RA_SOAT_HOI_THOAI_CSKH.md](file:///c:/workspace/PHAN-TICH-THIET-KE-WEBSITE-BAN-HANG-GIA-DUNG/BAO_CAO_RA_SOAT_HOI_THOAI_CSKH.md)

---

## TÓM TẮT KẾT QUẢ RÀ SOÁT

1. **Hiện trạng Database Models:**
   - Đã có sẵn 2 schema: `Conversation.model.ts` và `Message.model.ts` trong `BACK_END/src/models/` với các trường `status` (`open`, `pending`, `closed`), `assignedAdminId`, `customerUnreadCount`, `adminUnreadCount`.
2. **Hiện trạng Logic Backend:**
   - **HOÀN TOÀN CHƯA CÓ (0%):** Chưa có Controller, Service, Route, Validator nào cho hội thoại CSKH (cả phía Admin lẫn Customer).
   - **Hạ tầng Real-time:** Chưa cài `socket.io`, server chỉ chạy HTTP thông thường.
3. **Hiện trạng Frontend Admin:**
   - Đã dựng hoàn thiện giao diện tại `ADMIN/src/pages/conversations/ConversationsPage.tsx` nhưng **100% đang dùng Mock Data trong RAM**.
4. **Hiện trạng Frontend Khách hàng:**
   - Chưa có giao diện chat trực tiếp với nhân viên CSKH (mới chỉ có AI Chatbot Gemini).

---

## CÁC HẠNG MỤC CẦN BỔ SUNG

1. **Hạ tầng Real-time:** Cài đặt `socket.io` (backend) và `socket.io-client` (frontend), thiết lập phòng chat và sự kiện gửi nhận tin tức thì.
2. **REST API cho Admin:**
   - `GET /api/admin/conversations`: Danh sách hội thoại kèm bộ lọc (`status`, `assignedAdminId`, tìm kiếm, phân trang).
   - `GET /api/admin/conversations/statistics`: Thống kê (Tổng số, Đang xử lý, Chờ tiếp nhận, Tin chưa đọc).
   - `GET /api/admin/conversations/assignees`: Danh sách nhân viên trực ca để phân công.
   - `GET /api/admin/conversations/:id/messages`: Lấy tin nhắn theo hội thoại.
   - `POST /api/admin/conversations/:id/messages`: Gửi tin nhắn trả lời.
   - `PATCH /api/admin/conversations/:id/status`: Đổi trạng thái (`open` ↔ `closed`).
   - `PATCH /api/admin/conversations/:id/assign`: Bàn giao cho nhân viên khác + sinh system message tự động.
   - `PATCH /api/admin/conversations/:id/read`: Reset số tin chưa đọc.
3. **REST API cho Khách hàng:** Mở hội thoại, gửi tin nhắn, lấy lịch sử tin nhắn.
4. **Quy tắc State Machine & Vòng đời:** Khách gửi tin -> `pending` -> Admin nhận -> `open` -> Giải quyết xong -> `closed` -> Khách nhắn lại -> Tự động kích hoạt lại (`re-open`).
5. **Cổng chat phía Khách hàng:** Bổ sung Chat Widget trên `FRONT_END` để khách hàng có thể gửi tin nhắn lên cho Admin tiếp nhận.

> Xem tài liệu đặc tả kiến trúc chi tiết, sơ đồ tuần tự (Sequence Diagram) và lộ trình triển khai tại:  
> 👉 [BAO_CAO_RA_SOAT_HOI_THOAI_CSKH.md](file:///c:/workspace/PHAN-TICH-THIET-KE-WEBSITE-BAN-HANG-GIA-DUNG/BAO_CAO_RA_SOAT_HOI_THOAI_CSKH.md)
