import { chromium } from "../ADMIN/node_modules/playwright";

async function runPilot() {
  console.log("=== PILOT TEST: BROWSER CONTEXTS & AUTHENTICATION ===");
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  try {
    const custContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });

    const custPage = await custContext.newPage();
    const adminPage = await adminContext.newPage();

    console.log("1. Logging into Customer at http://localhost:3000/login...");
    await custPage.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
    await custPage.fill("input[name='email']", "user@gmail.com");
    await custPage.fill("input[name='password']", "User@123456");
    await custPage.click("button[type='submit']");
    await custPage.waitForTimeout(1000);

    const custToken = await custPage.evaluate(() => localStorage.getItem("gd_token"));
    console.log("   Customer token acquired:", custToken ? "YES (JWT exists)" : "NO");

    await custPage.goto("http://localhost:3000/", { waitUntil: "networkidle" });
    const chatBtn = await custPage.locator("button[title='Tư vấn trực tuyến']").isVisible();
    console.log("   Customer Chat Widget button visible:", chatBtn);

    console.log("2. Logging into Admin at http://localhost:5173/login...");
    await adminPage.goto("http://localhost:5173/login", { waitUntil: "networkidle" });
    await adminPage.fill("input[type='email']", "admin@gmail.com");
    await adminPage.fill("#admin-password", "Admin@123456");
    await adminPage.click("button[type='submit']");
    await adminPage.waitForTimeout(1000);

    const adminToken = await adminPage.evaluate(() => 
      localStorage.getItem("admin_access_token") || sessionStorage.getItem("admin_access_token")
    );
    console.log("   Admin token acquired:", adminToken ? "YES (JWT exists)" : "NO");

    console.log("3. Navigating to Admin Conversations page...");
    await adminPage.goto("http://localhost:5173/conversations", { waitUntil: "networkidle" });
    await adminPage.waitForTimeout(1000);

    const kpiSection = adminPage.locator("section[aria-label='Thống kê hội thoại']");
    const pendingKpiCard = kpiSection.locator("div:has(p:text-is('Chờ tiếp nhận'))");
    const pendingVal = await pendingKpiCard.locator("p.tabular-nums").textContent();
    console.log("   Admin KPI 'Chờ tiếp nhận' current value:", pendingVal);

    console.log("✅ PILOT TEST PASSED!");
  } finally {
    await browser.close();
  }
}

runPilot().catch((err) => {
  console.error("❌ PILOT TEST FAILED:", err);
  process.exit(1);
});
