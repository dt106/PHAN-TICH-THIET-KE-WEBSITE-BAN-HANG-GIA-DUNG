import { request } from "./http.ts";
import { readAiSession } from "./session.ts";
import type { AiChatResult, AiSearchResult } from "../types/api.ts";

const searchProductsWithAi = (query: string, page = 1, limit = 5) => {
  return request<AiSearchResult>("/api/ai/products/search", {
    method: "POST",
    auth: false,
    body: { query, page, limit },
  });
};

const sendChatMessage = (message: string, conversationId?: string) => {
  return request<AiChatResult>("/api/ai/chat", {
    method: "POST",
    auth: false,
    body: { message, conversationId, sessionId: readAiSession() },
  });
};

export const aiService = {
  searchProductsWithAi,
  sendChatMessage,
};
