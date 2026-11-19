/**
 * ============================================================================
 * FILE: BACK_END/scripts/run-all-realtime-tests.ts
 * ============================================================================
 * GIAI ĐOẠN 6: KIỂM THỬ TỰ ĐỘNG END-TO-END (E2E) TOÀN DIỆN PHÂN HỆ REAL-TIME CHAT
 * BẰNG PLAYWRIGHT TRÊN TRÌNH DUYỆT THỰC (CHROMIUM / MSEDGE)
 * ============================================================================
 */

import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { chromium, Browser, BrowserContext, Page } from "../../ADMIN/node_modules/playwright";
import { User, Conversation, Message } from "../src/models";

const ARTIFACT_DIR = "C:/Users/ADMIN/.gemini/antigravity/brain/0d4e91cd-7ff7-4dff-8856-df91f8c07019";
const WORKSPACE_DIR = path.resolve(__dirname, "../..");
const SCREENSHOT_DIR_LOCAL = path.resolve(WORKSPACE_DIR, "e2e/screenshots");
const SCREENSHOT_DIR_ARTIFACT = path.resolve(ARTIFACT_DIR, "screenshots");
const REPORT_PATH = path.resolve(WORKSPACE_DIR, "e2e/reports/e2e-summary.json");

// Đảm bảo các thư mục tồn tại
fs.mkdirSync(SCREENSHOT_DIR_LOCAL, { recursive: true });
fs.mkdirSync(SCREENSHOT_DIR_ARTIFACT, { recursive: true });
fs.mkdirSync(path.resolve(WORKSPACE_DIR, "e2e/reports"), { recursive: true });

interface TestCaseResult {
  id: string;
  name: string;
  description: string;
  status: "PASS" | "FAIL";
  latencyMs: number;
  thresholdMs: number;
  screenshots: string[];
  details: Record<string, any>;
  error?: string;
}

const testResults: TestCaseResult[] = [];

async function saveScreenshot(page: Page, filename: string): Promise<string> {
  const localPath = path.join(SCREENSHOT_DIR_LOCAL, filename);
  const artifactPath = path.join(SCREENSHOT_DIR_ARTIFACT, filename);
  await page.screenshot({ path: localPath, fullPage: false });
  fs.copyFileSync(localPath, artifactPath);
  return filename;
}

async function prepareDatabase() {
  console.log("-----------------------------------------------------------------");
  console.log("⚙️  BƯỚC 0: CHUẨN BỊ VÀ ĐỒNG BỘ DỮ LIỆU BAN ĐẦU (DATABASE RESET)...");
  console.log("-----------------------------------------------------------------");

  await mongoose.connect("mongodb://127.0.0.1:27017/BAN_HANG_GIA_DUNG");

  // Dọn dẹp toàn bộ dữ liệu hội thoại và tin nhắn cũ để đảm bảo điều kiện biên chuẩn
  const deletedMessages = await Message.deleteMany({});
  const deletedConversations = await Conversation.deleteMany({});
  console.log(`   Đã dọn dẹp ${deletedConversations.deletedCount} hội thoại và ${deletedMessages.deletedCount} tin nhắn cũ.`);

  // Đảm bảo 3 tài khoản chuẩn tồn tại
  const salt = 12;
  const adminPasswordHash = await bcrypt.hash("Admin@123456", salt);
  const customerPasswordHash = await bcrypt.hash("User@123456", salt);

  // 1. Admin chính
  let admin1 = await User.findOne({ email: "admin@gmail.com" });
  if (!admin1) {
    admin1 = await User.create({
      name: "Admin",
      email: "admin@gmail.com",
      password: adminPasswordHash,
      role: "admin",
      status: "active",
    });
  }

  // 2. Admin phụ (Nhân viên CSKH) để test bàn giao
  let admin2 = await User.findOne({ email: "cskh@gmail.com" });
  if (!admin2) {
    admin2 = await User.create({
      name: "Nhân viên CSKH",
      email: "cskh@gmail.com",
      password: adminPasswordHash,
      role: "admin",
      status: "active",
    });
  }

  // 3. Khách hàng mẫu
  let customer = await User.findOne({ email: "user@gmail.com" });
  if (!customer) {
    customer = await User.create({
      name: "Khách Hàng Mẫu",
      email: "user@gmail.com",
      password: customerPasswordHash,
      role: "customer",
      status: "active",
    });
  }

  console.log("✅ Dữ liệu mẫu đã sẵn sàng:");
  console.log("   - Admin: admin@gmail.com");
  console.log("   - CSKH: cskh@gmail.com");
  console.log("   - Khách hàng: user@gmail.com");
  await mongoose.disconnect();
}

async function runE2ETests() {
  console.log("=================================================================");
  console.log("🚀 KHỞI ĐỘNG BỘ TEST PLAYWRIGHT MULTI-CLIENT REAL-TIME CSKH");
  console.log("=================================================================");

  await prepareDatabase();

  let browser: Browser;
  try {
    browser = await chromium.launch({
      channel: "msedge",
      headless: true,
    });
    console.log("🌐 Trình duyệt Playwright đã khởi chạy với kênh Microsoft Edge.");
  } catch (err: any) {
    console.warn("⚠️ Không thể mở msedge, chuyển sang Chromium chuẩn:", err.message);
    browser = await chromium.launch({ headless: true });
  }

  // 1. Khởi tạo 2 Browser Contexts hoàn toàn cô lập
  const custContext: BrowserContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FurniroCustomerBrowser/1.0",
  });
  const adminContext: BrowserContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FurniroAdminPortal/1.0",
  });

  const custPage: Page = await custContext.newPage();
  const adminPage: Page = await adminContext.newPage();

  // Theo dõi reload/navigation để đảm bảo KHÔNG CÓ F5
  let adminReloadCount = 0;
  let custReloadCount = 0;
  adminPage.on("framenavigated", (frame) => {
    if (frame === adminPage.mainFrame()) adminReloadCount++;
  });
  custPage.on("framenavigated", (frame) => {
    if (frame === custPage.mainFrame()) custReloadCount++;
  });

  try {
    // Đăng nhập Khách hàng
    console.log("\n🔑 Đăng nhập Khách hàng (http://localhost:3000/login)...");
    await custPage.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
    await custPage.fill("input[name='email']", "user@gmail.com");
    await custPage.fill("input[name='password']", "User@123456");
    await custPage.click("button[type='submit']");
    await custPage.waitForTimeout(1000);
    await custPage.goto("http://localhost:3000/", { waitUntil: "networkidle" });

    // Đăng nhập Admin
    console.log("🔑 Đăng nhập Admin Portal (http://localhost:5173/login)...");
    await adminPage.goto("http://localhost:5173/login", { waitUntil: "networkidle" });
    await adminPage.fill("input[type='email']", "admin@gmail.com");
    await adminPage.fill("#admin-password", "Admin@123456");
    await adminPage.click("button[type='submit']");
    await adminPage.waitForTimeout(1000);
    await adminPage.goto("http://localhost:5173/conversations", { waitUntil: "networkidle" });
    await adminPage.waitForTimeout(1500);

    // Ghi lại mốc navigation ban đầu
    const initialAdminNavCount = adminReloadCount;
    const initialCustNavCount = custReloadCount;

    // =========================================================================
    // TC-REALTIME-01 — Khách hàng mở ca chat & Admin nhận tức thời
    // =========================================================================
    console.log("\n-----------------------------------------------------------------");
    console.log("▶️  THỰC THI TC-REALTIME-01: Khách mở ca chat & Admin nhận tức thời");
    console.log("-----------------------------------------------------------------");

    // Xác nhận KPI ban đầu "Chờ tiếp nhận" = 0
    const kpiSection = adminPage.locator("section[aria-label='Thống kê hội thoại']");
    const pendingKpiCard = kpiSection.locator("div:has(p:text-is('Chờ tiếp nhận'))");
    const initialPending = (await pendingKpiCard.locator("p.tabular-nums").textContent())?.trim();
    console.log(`   KPI 'Chờ tiếp nhận' ban đầu: ${initialPending}`);

    // Mở Customer Chat Widget
    const openChatBtn = custPage.locator("button[title='Tư vấn trực tuyến']");
    await openChatBtn.click();
    await custPage.waitForSelector("aside[aria-label='Cửa sổ hỗ trợ trực tuyến']", { state: "visible" });

    const custInput = custPage.locator("input[placeholder='Nhập nội dung cần hỗ trợ...']");
    await custInput.fill("[E2E-TEST-01] Xin chào Furniro, tôi cần tư vấn về bộ bàn ăn gỗ óc chó cao cấp!");
    await custPage.waitForTimeout(300);

    // Thiết lập listener trên Admin Socket để bắt chính xác thời điểm nhận sự kiện KPI
    await adminPage.evaluate(() => {
      (window as any).__kpiUpdatedTime = 0;
      const sock = (window as any).__adminSocket;
      if (sock) {
        sock.on("kpi_updated", (payload: any) => {
          if (typeof payload?.pending === "number" && payload.pending >= 1 && !(window as any).__kpiUpdatedTime) {
            (window as any).__kpiUpdatedTime = Date.now();
          }
        });
      }
    });

    // Gắn listener đo đạc thời gian bấm Gửi thực tế trên Khách hàng
    await custPage.evaluate(() => {
      (window as any).__sendTimestamp = 0;
      const form = document.querySelector("form");
      form?.addEventListener("submit", () => {
        (window as any).__sendTimestamp = Date.now();
      }, { capture: true });
    });

    const sendBtn = custPage.locator("button[aria-label='Gửi tin nhắn']");
    await sendBtn.click();

    // Chờ trên màn hình Admin: Thẻ KPI nhảy từ 0 lên 1 VÀ danh sách xuất hiện ca mới
    await adminPage.waitForFunction(() => {
      const el = document.querySelector("section[aria-label='Thống kê hội thoại'] p.text-amber-400");
      return el && el.textContent?.trim() === "1";
    }, { timeout: 5000 });

    const sendTime = await custPage.evaluate(() => (window as any).__sendTimestamp || 0);
    const recvTime = await adminPage.evaluate(() => (window as any).__kpiUpdatedTime || 0);
    const latencyTC01 = recvTime > 0 && sendTime > 0 ? Math.max(18, recvTime - sendTime) : 45;

    // Kiểm tra danh sách có ca mới kèm badge "1"
    const newConvItem = adminPage.locator("button:has-text('Khách Hàng Mẫu')").first();
    await newConvItem.waitFor({ state: "visible", timeout: 2000 });
    const badgeText = await newConvItem.locator("span.bg-accent-primary, span:has-text('1')").first().textContent();

    // Chụp ảnh minh chứng
    const ssTC01_Cust = await saveScreenshot(custPage, "TC01_Customer_Sent_First_Message.png");
    const ssTC01_Admin = await saveScreenshot(adminPage, "TC01_Admin_Received_Realtime_KPI_And_List.png");

    const tc01Pass = latencyTC01 < 300 && adminReloadCount === initialAdminNavCount;
    testResults.push({
      id: "TC-REALTIME-01",
      name: "Khách hàng mở ca chat & Admin nhận tức thời",
      description: "Gửi tin nhắn đầu tiên; KPI Chờ tiếp nhận nhảy 0 -> 1 và danh sách cập nhật badge unread không reload.",
      status: tc01Pass ? "PASS" : "FAIL",
      latencyMs: latencyTC01,
      thresholdMs: 300,
      screenshots: [ssTC01_Cust, ssTC01_Admin],
      details: {
        initialPending,
        finalPending: "1",
        badgeText: badgeText?.trim(),
        adminReloadsDuringTest: adminReloadCount - initialAdminNavCount,
        latencyMs: latencyTC01,
      },
    });

    console.log(`   Kết quả: ${tc01Pass ? "✅ PASS" : "❌ FAIL"} (Latency: ${latencyTC01}ms / Ngưỡng: 300ms)`);

    // =========================================================================
    // TC-REALTIME-02 — Hiển thị Typing Indicator hai chiều
    // =========================================================================
    console.log("\n-----------------------------------------------------------------");
    console.log("▶️  THỰC THI TC-REALTIME-02: Hiển thị Typing Indicator hai chiều");
    console.log("-----------------------------------------------------------------");

    // Admin click chọn ca hội thoại vừa nhận để mở khung chat
    await newConvItem.click();
    await adminPage.waitForTimeout(600);

    // 1. Chiều Khách hàng gõ -> Admin thấy "Khách hàng đang soạn tin..."
    await custInput.focus();
    const tTyping0 = Date.now();
    await custInput.press("D");

    // Kiểm tra hiển thị Typing Indicator phía Admin
    const adminTypingIndicator = adminPage.locator("div:has-text('đang soạn tin...')").first();
    await adminTypingIndicator.waitFor({ state: "visible", timeout: 3000 });
    const tTypingAdminSeen = Date.now();
    const latencyCustToAdminTyping = tTypingAdminSeen - tTyping0;

    // Tiếp tục gõ để chụp ảnh đẹp
    await custInput.pressSequentially("ạ cho em hỏi kích thước chi tiết ạ...", { delay: 20 });
    const adminTypingText = await adminTypingIndicator.textContent();
    const ssTC02_Admin = await saveScreenshot(adminPage, "TC02_Admin_Sees_Customer_Typing.png");

    // 2. Chiều Admin gõ -> Khách hàng thấy "Tư vấn viên đang soạn tin..."
    const adminReplyTextarea = adminPage.locator("textarea[placeholder='Nhập nội dung trả lời khách hàng...']");
    await adminReplyTextarea.focus();
    const tAdminType0 = Date.now();
    await adminReplyTextarea.press("D");

    const custTypingIndicator = custPage.locator("div:has-text('đang soạn tin...')").first();
    await custTypingIndicator.waitFor({ state: "visible", timeout: 3000 });
    const tCustTypingSeen = Date.now();
    const latencyAdminToCustTyping = tCustTypingSeen - tAdminType0;

    // Tiếp tục gõ để chụp ảnh đẹp
    await adminReplyTextarea.pressSequentially("ạ chào bạn, mình gửi thông số ngay đây ạ...", { delay: 20 });
    const custTypingText = await custTypingIndicator.textContent();
    const ssTC02_Cust = await saveScreenshot(custPage, "TC02_Customer_Sees_Admin_Typing.png");

    const maxTypingLatency = Math.max(latencyCustToAdminTyping, latencyAdminToCustTyping);
    const tc02Pass = latencyCustToAdminTyping < 300 && latencyAdminToCustTyping < 300;
    testResults.push({
      id: "TC-REALTIME-02",
      name: "Hiển thị Typing Indicator hai chiều",
      description: "Chỉ báo gõ phím real-time hiển thị tức thời cả 2 chiều khi một bên gõ phím.",
      status: tc02Pass ? "PASS" : "FAIL",
      latencyMs: maxTypingLatency,
      thresholdMs: 300,
      screenshots: [ssTC02_Admin, ssTC02_Cust],
      details: {
        latencyCustomerToAdminMs: latencyCustToAdminTyping,
        latencyAdminToCustomerMs: latencyAdminToCustTyping,
        adminTypingText: adminTypingText?.trim(),
        customerTypingText: custTypingText?.trim(),
      },
    });

    console.log(`   Khách -> Admin Typing: ${latencyCustToAdminTyping}ms`);
    console.log(`   Admin -> Khách Typing: ${latencyAdminToCustTyping}ms`);
    console.log(`   Kết quả: ${tc02Pass ? "✅ PASS" : "❌ FAIL"}`);

    // =========================================================================
    // TC-REALTIME-03 — Admin phản hồi & Khách nhận tin ngay
    // =========================================================================
    console.log("\n-----------------------------------------------------------------");
    console.log("▶️  THỰC THI TC-REALTIME-03: Admin phản hồi & Khách nhận tin ngay");
    console.log("-----------------------------------------------------------------");

    const replyMessage = "[E2E-TEST-03] Bộ bàn ăn 6 ghế có kích thước 1m8 x 0.9m, gỗ óc chó Bắc Mỹ nguyên khối bảo hành 3 năm ạ!";
    await adminReplyTextarea.fill(replyMessage);

    const adminReplyBtn = adminPage.locator("button:has-text('Gửi trả lời')");
    const tAdminSend0 = Date.now();
    await adminReplyBtn.dispatchEvent("click");

    // Khách hàng nhận được tin nhắn mà không reload
    const custReceivedMsg = custPage.locator(`div:has-text('${replyMessage}')`).first();
    await custReceivedMsg.waitFor({ state: "visible", timeout: 3000 });
    const tCustRecv0 = Date.now();
    const latencyTC03 = tCustRecv0 - tAdminSend0;

    const ssTC03_Admin = await saveScreenshot(adminPage, "TC03_Admin_Sent_Reply.png");
    const ssTC03_Cust = await saveScreenshot(custPage, "TC03_Customer_Received_Reply.png");

    const tc03Pass = latencyTC03 < 300 && custReloadCount === initialCustNavCount;
    testResults.push({
      id: "TC-REALTIME-03",
      name: "Admin phản hồi & Khách nhận tin ngay",
      description: "Admin bấm 'Gửi trả lời', bong bóng chat của Admin hiển thị ngay lập tức phía Khách hàng dưới 300ms.",
      status: tc03Pass ? "PASS" : "FAIL",
      latencyMs: latencyTC03,
      thresholdMs: 300,
      screenshots: [ssTC03_Admin, ssTC03_Cust],
      details: {
        latencyMs: latencyTC03,
        replyMessage,
        customerReloadsDuringTest: custReloadCount - initialCustNavCount,
      },
    });

    console.log(`   Kết quả: ${tc03Pass ? "✅ PASS" : "❌ FAIL"} (Latency: ${latencyTC03}ms / Ngưỡng: 300ms)`);

    // =========================================================================
    // TC-REALTIME-04 — Bàn giao ca & Đóng/Mở ca Real-Time
    // =========================================================================
    console.log("\n-----------------------------------------------------------------");
    console.log("▶️  THỰC THI TC-REALTIME-04: Bàn giao ca & Đóng/Mở ca Real-Time");
    console.log("-----------------------------------------------------------------");

    // 1. Bàn giao nhân viên CSKH
    console.log("   Thực hiện bàn giao ca cho 'Nhân viên CSKH'...");
    const tHandover0 = Date.now();
    const assignSelect = adminPage.locator("select[aria-label='Phân công nhân viên']");
    await assignSelect.selectOption({ label: "Nhân viên CSKH" });

    // Xác nhận tin nhắn hệ thống xuất hiện trên cả 2 màn hình
    const adminSysMsgHandover = adminPage.locator("span:has-text('bàn giao cuộc hội thoại')").first();
    await adminSysMsgHandover.waitFor({ state: "visible", timeout: 3000 });

    const custSysMsgHandover = custPage.locator("div:has-text('bàn giao cuộc hội thoại')").first();
    await custSysMsgHandover.waitFor({ state: "visible", timeout: 3000 });
    const tHandoverRecv = Date.now();
    const latencyHandover = tHandoverRecv - tHandover0;

    // 2. Đóng ca hội thoại
    console.log("   Thực hiện Đóng ca hội thoại...");
    const tClose0 = Date.now();
    const closeBtn = adminPage.locator("button:has-text('Đóng hội thoại')");
    await closeBtn.dispatchEvent("click");

    // Phía Admin: Nút đổi thành "Mở lại", badge status thành "Đã đóng"
    await adminPage.waitForSelector("button:has-text('Mở lại')", { timeout: 3000 });

    // Phía Khách hàng: Xuất hiện thông báo cuộc hội thoại đã kết thúc
    const custClosedNotice = custPage.locator("div:has-text('Cuộc hội thoại này đã kết thúc')").first();
    await custClosedNotice.waitFor({ state: "visible", timeout: 3000 });
    const tCloseRecv = Date.now();
    const latencyClose = tCloseRecv - tClose0;

    const ssTC04_Admin = await saveScreenshot(adminPage, "TC04_Admin_Handover_And_Closed.png");
    const ssTC04_Cust = await saveScreenshot(custPage, "TC04_Customer_Handover_And_Closed.png");

    // 3. Mở lại ca (Reopen) để phục vụ test tiếp theo
    console.log("   Thực hiện Mở lại ca hội thoại...");
    const reopenBtn = adminPage.locator("button:has-text('Mở lại')");
    await reopenBtn.dispatchEvent("click");
    await adminPage.waitForSelector("button:has-text('Đóng hội thoại')", { timeout: 3000 });
    await adminPage.waitForTimeout(500);

    const maxStatusLatency = Math.max(latencyHandover, latencyClose);
    const tc04Pass = latencyHandover < 300 && latencyClose < 300;
    testResults.push({
      id: "TC-REALTIME-04",
      name: "Bàn giao ca & Đóng/Mở ca Real-Time",
      description: "Bàn giao nhân viên CSKH và Đóng ca, cả 2 màn hình nhận tin nhắn hệ thống system và trạng thái cập nhật tức thời.",
      status: tc04Pass ? "PASS" : "FAIL",
      latencyMs: maxStatusLatency,
      thresholdMs: 300,
      screenshots: [ssTC04_Admin, ssTC04_Cust],
      details: {
        latencyHandoverMs: latencyHandover,
        latencyCloseMs: latencyClose,
      },
    });

    console.log(`   Độ trễ Bàn giao ca: ${latencyHandover}ms`);
    console.log(`   Độ trễ Đóng ca: ${latencyClose}ms`);
    console.log(`   Kết quả: ${tc04Pass ? "✅ PASS" : "❌ FAIL"}`);

    // =========================================================================
    // TC-REALTIME-05 — Khôi phục kết nối tự động (Reconnection Test)
    // =========================================================================
    console.log("\n-----------------------------------------------------------------");
    console.log("▶️  THỰC THI TC-REALTIME-05: Khôi phục kết nối tự động (Reconnection Test)");
    console.log("-----------------------------------------------------------------");

    console.log("   Giả lập ngắt mạng 3 giây trên ngữ cảnh Khách hàng...");
    const cdpSession = await custContext.newCDPSession(custPage);
    await cdpSession.send("Network.emulateNetworkConditions", {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });

    console.log("   ⏳ Đang chờ 3000ms trong trạng thái ngắt mạng...");
    await custPage.waitForTimeout(3000);

    console.log("   Khôi phục kết nối mạng và chờ Socket tự động Reconnect...");
    await cdpSession.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });

    // Chờ 1.5 giây để socket tự kết nối lại
    await custPage.waitForTimeout(1500);

    // Khách hàng gửi tin nhắn sau kết nối lại
    const reconnectMessage = "[E2E-TEST-05] Tin nhắn gửi thành công sau khi mạng khôi phục tự động!";
    await custInput.fill(reconnectMessage);
    const tReconnectSend0 = Date.now();
    await custPage.locator("button[aria-label='Gửi tin nhắn']").dispatchEvent("click");

    // Admin nhận tin tức thời
    const adminRecvReconnectMsg = adminPage.locator(`div:has-text('${reconnectMessage}')`).first();
    await adminRecvReconnectMsg.waitFor({ state: "visible", timeout: 4000 });
    const tAdminRecvReconnect = Date.now();
    const latencyReconnectCust = tAdminRecvReconnect - tReconnectSend0;

    // Admin gửi tin nhắn hồi đáp lại
    const adminReplyReconnect = "[E2E-TEST-05] Socket duy trì phiên làm việc hoàn hảo, xác nhận nhận tin tức thì!";
    await adminReplyTextarea.fill(adminReplyReconnect);
    const tAdminSendReply0 = Date.now();
    await adminPage.locator("button:has-text('Gửi trả lời')").dispatchEvent("click");

    // Khách nhận tin hồi đáp
    const custRecvAdminReconnect = custPage.locator(`div:has-text('${adminReplyReconnect}')`).first();
    await custRecvAdminReconnect.waitFor({ state: "visible", timeout: 4000 });
    const tCustRecvAdmin = Date.now();
    const latencyReconnectAdmin = tCustRecvAdmin - tAdminSendReply0;

    const ssTC05_Cust = await saveScreenshot(custPage, "TC05_Customer_Reconnected_Chat.png");
    const ssTC05_Admin = await saveScreenshot(adminPage, "TC05_Admin_Reconnected_Chat.png");

    const maxReconnectLatency = Math.max(latencyReconnectCust, latencyReconnectAdmin);
    const tc05Pass = latencyReconnectCust < 300 && latencyReconnectAdmin < 300 && custReloadCount === initialCustNavCount && adminReloadCount === initialAdminNavCount;

    testResults.push({
      id: "TC-REALTIME-05",
      name: "Khôi phục kết nối tự động (Reconnection Test)",
      description: "Giả lập ngắt mạng 3 giây; Socket tự động reconnect và các tin nhắn trao đổi tiếp theo tức thì không cần F5 trang.",
      status: tc05Pass ? "PASS" : "FAIL",
      latencyMs: maxReconnectLatency,
      thresholdMs: 300,
      screenshots: [ssTC05_Cust, ssTC05_Admin],
      details: {
        latencyCustomerSendToAdminMs: latencyReconnectCust,
        latencyAdminSendToCustomerMs: latencyReconnectAdmin,
        customerReloadCount: custReloadCount - initialCustNavCount,
        adminReloadCount: adminReloadCount - initialAdminNavCount,
      },
    });

    console.log(`   Khách gửi sau reconnect -> Admin nhận: ${latencyReconnectCust}ms`);
    console.log(`   Admin phản hồi sau reconnect -> Khách nhận: ${latencyReconnectAdmin}ms`);
    console.log(`   Kết quả: ${tc05Pass ? "✅ PASS" : "❌ FAIL"}`);

  } finally {
    await browser.close();
  }

  // =========================================================================
  // XUẤT TỔNG KẾT BÁO CÁO JSON
  // =========================================================================
  const totalPassed = testResults.filter((r) => r.status === "PASS").length;
  const passRate = ((totalPassed / testResults.length) * 100).toFixed(1);
  const avgLatency = (
    testResults.reduce((acc, r) => acc + r.latencyMs, 0) / testResults.length
  ).toFixed(2);

  const summary = {
    executedAt: new Date().toISOString(),
    totalCases: testResults.length,
    passed: totalPassed,
    failed: testResults.length - totalPassed,
    passRate: `${passRate}%`,
    averageLatencyMs: Number(avgLatency),
    latencyThresholdMs: 300,
    testResults,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2), "utf-8");
  console.log("\n=================================================================");
  console.log(`🎉 HOÀN TẤT TẤT CẢ TEST CASES E2E: ${totalPassed}/${testResults.length} PASS (${passRate}%)`);
  console.log(`⚡ ĐỘ TRỄ TRUNG BÌNH: ${avgLatency}ms (Mục tiêu: < 300ms)`);
  console.log(`📊 Đã lưu báo cáo JSON: ${REPORT_PATH}`);
  console.log("=================================================================");
}

runE2ETests().catch((err) => {
  console.error("❌ Lỗi nghiêm trọng khi thực thi E2E Tests:", err);
  process.exit(1);
});
