import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const mailFile = process.env.E2E_MAIL_FILE || "/tmp/furniro-e2e-mail.txt";
const stamp = Date.now();
const email = `e2e.${stamp}@example.com`;
const password = "E2eUser@1";
const recipient = "Nguyễn E2E";
const street = `12 Lê Lợi ${stamp}`;

let context: BrowserContext;
let page: Page;
let orderNumber = "";

function decodeQuotedPrintable(input: string) {
  const unfolded = input.replace(/=\r?\n/g, "");
  const bytes: number[] = [];
  for (let index = 0; index < unfolded.length; index += 1) {
    if (unfolded[index] === "=" && /[0-9A-Fa-f]{2}/.test(unfolded.slice(index + 1, index + 3))) {
      bytes.push(Number.parseInt(unfolded.slice(index + 1, index + 3), 16));
      index += 2;
    } else {
      bytes.push(unfolded.charCodeAt(index) & 0xff);
    }
  }
  return Buffer.from(bytes).toString("utf8");
}

async function readOtp() {
  const started = Date.now();
  while (Date.now() - started < 20_000) {
    if (fs.existsSync(mailFile)) {
      const decoded = decodeQuotedPrintable(fs.readFileSync(mailFile, "utf8"));
      if (decoded.includes(email)) {
        const match = decoded.match(/Mã OTP của bạn:\s*(\d{6})/);
        if (match) return match[1];
      }
    }
    await page.waitForTimeout(250);
  }
  throw new Error(
    "Không đọc được OTP. Backend cần MAIL_HOST=127.0.0.1 và MAIL_PORT=2525 (SMTP sink của e2e). OTP không nằm trong MongoDB.",
  );
}

function main() {
  return page.locator("main");
}

async function shot(name: string) {
  const file = path.join("e2e-results", "steps", `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
}

test.describe.serial("hành trình khách hàng", () => {
  test.beforeAll(async ({ browser }) => {
    fs.mkdirSync(path.join("e2e-results", "steps"), { recursive: true });
    context = await browser.newContext({
      baseURL: "http://localhost:3000",
      recordVideo: { dir: path.join("e2e-results", "video"), size: { width: 1280, height: 800 } },
      viewport: { width: 1280, height: 800 },
    });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test("đăng ký bằng OTP", async () => {
    fs.writeFileSync(mailFile, "");
    await page.goto("/login?mode=register");
    await main().getByLabel("Email").fill(email);
    await main().getByRole("button", { name: "Gửi OTP" }).click();
    await expect(main().getByLabel("Mã OTP")).toBeVisible();
    const otp = await readOtp();
    await main().getByLabel("Mã OTP").fill(otp);
    await main().getByRole("button", { name: "Xác thực OTP" }).click();
    await main().getByLabel("Họ tên").fill(recipient);
    await main().getByLabel("Số điện thoại").fill("0987654321");
    await main().locator('input[type="password"]').nth(0).fill(password);
    await main().locator('input[type="password"]').nth(1).fill(password);
    await main().getByRole("button", { name: "Hoàn tất đăng ký" }).click();
    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByRole("heading", { name: recipient })).toBeVisible();
    await shot("01-register");
  });

  test("đăng xuất và đăng nhập lại", async () => {
    await page.getByRole("button", { name: "Đăng xuất" }).click();
    await expect(page).toHaveURL("http://localhost:3000/");
    await page.goto("/login");
    await main().getByLabel("Email").fill(email);
    await main().getByLabel("Mật khẩu").fill(password);
    await main().getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByText(email)).toBeVisible();
    await shot("02-login");
  });

  test("xem, tìm và lọc sản phẩm", async () => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Sản phẩm nổi bật" })).toBeVisible();
    await expect(page.getByText("Ghế cafe").first()).toBeVisible();
    await page.getByRole("button", { name: "Tìm kiếm" }).click();
    await page.getByLabel("Tìm sản phẩm").fill("cafe");
    await page.getByLabel("Tìm sản phẩm").press("Enter");
    await expect(page).toHaveURL(/q=cafe/);
    await expect(page.getByRole("link", { name: "Ghế cafe" }).first()).toBeVisible();
    await page.goto("/shop");
    await expect(page.getByRole("option", { name: "Phòng khách" })).toBeAttached();
    await page.getByLabel("Danh mục").selectOption({ label: "Phòng khách" });
    await expect(page.getByRole("link", { name: "Bàn ăn" }).first()).toBeVisible();
    await shot("03-catalog");
  });

  test("xem chi tiết sản phẩm có phân loại", async () => {
    await page.goto("/shop/ban-an");
    await expect(page.getByRole("heading", { name: "Bàn ăn" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Gỗ sồi|BAN-01/ })).toBeVisible();
    await expect(page.getByText(/Còn \d+ sản phẩm/)).toBeVisible();
    await shot("04-detail");
  });

  test("thêm vào danh sách yêu thích", async () => {
    await page.goto("/shop/ghe-cafe");
    await page.getByRole("button", { name: "Yêu thích" }).first().click();
    await expect(page.getByRole("button", { name: "Đã yêu thích" })).toBeVisible();
    await page.goto("/wishlist");
    await expect(page.getByRole("link", { name: "Ghế cafe" })).toBeVisible();
    await shot("05-wishlist");
  });

  test("thêm, sửa số lượng và xóa giỏ hàng", async () => {
    await page.goto("/shop/ban-an");
    await page.getByRole("button", { name: "Thêm vào giỏ" }).first().click();
    await expect(page.getByText(/Đã thêm Bàn ăn/)).toBeVisible();
    await page.goto("/shop/ghe-cafe");
    await page.getByRole("button", { name: "Thêm vào giỏ" }).first().click();
    await expect(page.getByText(/Đã thêm Ghế cafe/)).toBeVisible();
    await page.goto("/cart");
    await expect(page.getByRole("link", { name: /Bàn ăn/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Ghế cafe/ })).toBeVisible();
    await page.getByRole("button", { name: "Xóa Ghế cafe" }).click();
    await expect(page.getByRole("link", { name: /Ghế cafe/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Tăng số lượng" }).click();
    await expect(page.getByRole("textbox", { name: "Số lượng" })).toHaveValue("2");
    await shot("06-cart");
  });

  test("thêm địa chỉ giao hàng", async () => {
    await page.goto("/account");
    await page.getByRole("button", { name: "Địa chỉ" }).click();
    await main().getByLabel("Người nhận").fill(recipient);
    await main().getByLabel("Số điện thoại").fill("0987654321");
    await main().getByLabel(/^Địa chỉ/).fill(street);
    await main().getByLabel("Phường/xã").fill("Bến Nghé");
    await main().getByLabel("Quận/huyện").fill("Quận 1");
    await main().getByLabel("Tỉnh/thành").fill("TP.HCM");
    await main().getByRole("button", { name: "Lưu địa chỉ" }).click();
    await expect(page.getByText(street)).toBeVisible();
    await shot("07-address");
  });

  test("áp mã giảm giá và đặt hàng COD", async () => {
    await page.goto("/checkout");
    await expect(page.getByText(recipient).first()).toBeVisible();
    await main().getByLabel("Mã giảm giá").fill("WELCOME10");
    await expect(page.getByText("Giảm giá")).toBeVisible();
    await expect(page.getByText(/1\.360\.000/)).toBeVisible();
    await page.getByRole("button", { name: "Đặt hàng" }).click();
    await expect(page).toHaveURL(/\/orders\/[a-f0-9]{24}/);
    orderNumber = (await page.getByRole("heading").filter({ hasText: "DH-" }).textContent()) || "";
    expect(orderNumber).toContain("DH-");
    await shot("08-checkout-cod");
  });

  test("xem lịch sử và chi tiết đơn", async () => {
    await page.goto("/orders");
    await expect(page.getByRole("link", { name: /DH-/ }).first()).toBeVisible();
    await page.getByRole("link", { name: /DH-/ }).first().click();
    await expect(page).toHaveURL(/\/orders\/[a-f0-9]{24}/);
    await expect(page.getByText("Bàn ăn")).toBeVisible();
    await expect(page.getByText("Chờ xác nhận")).toBeVisible();
    await shot("09-orders");
  });

  test("hủy đơn chưa thanh toán", async () => {
    await page.getByRole("button", { name: "Hủy đơn" }).click();
    await expect(page.getByText("Đã hủy đơn hàng.")).toBeVisible();
    await expect(page.getByText(/Đã hủy ·/)).toBeVisible();
    await shot("10-cancel");
  });

  test("thanh toán thử VNPay khi PAYMENT_ENV=mock", async () => {
    await page.goto("/shop/ghe-cafe");
    await page.getByRole("button", { name: "Thêm vào giỏ" }).first().click();
    await expect(page.getByText(/Đã thêm Ghế cafe/)).toBeVisible();
    await page.goto("/checkout");
    await page.getByRole("radio", { name: /VNPay/ }).check();
    await page.getByRole("button", { name: "Đặt hàng" }).click();
    await expect(page).toHaveURL(/\/payment\/result\?/);
    await page.getByRole("button", { name: "Hoàn tất thanh toán thử" }).click();
    await expect(page.getByText(/thanh toán thử/i)).toBeVisible();
    await shot("11-payment-mock");
  });

  test("đánh giá sản phẩm — backend chưa có API tạo review", async () => {
    await page.goto("/shop/ghe-cafe");
    await page.getByRole("tab", { name: /Đánh giá/ }).click();
    await expect(page.getByText("Cửa hàng chưa có API để gửi đánh giá mới.")).toBeVisible();
    await shot("12-reviews-missing-api");
    test.info().annotations.push({
      type: "gap",
      description: "Backend không có API tạo đánh giá sản phẩm. UI chỉ hiện điểm tổng và thông báo thiếu API.",
    });
  });
});
