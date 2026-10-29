/**
 * =========================================================
 * FILE: BACK_END/src/config/gemini.ts
 * =========================================================
 *
 * NHIỆM VỤ:
 * - Khởi tạo Google Gemini SDK.
 * - Đọc API key từ biến môi trường.
 * - Cung cấp model dùng để phân tích câu tìm kiếm sản phẩm.
 */

import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn(
    "⚠️ Cảnh báo: Thiếu GEMINI_API_KEY trong file .env. Tính năng AI Product Search sẽ yêu cầu cấu hình GEMINI_API_KEY.",
  );
}

export const gemini = new GoogleGenAI({
  apiKey: apiKey || "dummy_api_key_placeholder",
});

export const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-2.5-flash";