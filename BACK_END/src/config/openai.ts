
/**
 * =========================================================
 * FILE: BACK_END/src/config/openai.ts
 * =========================================================
 *
 * NHIỆM VỤ:
 * - Khởi tạo OpenAI client.
 * - Đọc API key từ biến môi trường.
 * - Không ghi cứng API key trong source code.
 */

import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn(
    "⚠️ Cảnh báo: Thiếu OPENAI_API_KEY trong file .env.",
  );
}

export const openai = new OpenAI({
  apiKey: apiKey || "dummy_api_key_placeholder",
});

export const OPENAI_MODEL =
  process.env.OPENAI_MODEL || "gpt-4.1-mini";
