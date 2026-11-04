import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button, showToast } from "../../components/common/index.ts";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { ProductCard } from "../../components/product/ProductCard.tsx";
import { toCard } from "../../lib/productView.ts";
import { aiService } from "../../services/ai.service.ts";
import { errorText } from "../../services/http.ts";
import type { Product } from "../../types/api.ts";

type Turn = { role: "user" | "assistant"; text: string; products?: Product[] };

export function AssistantPage() {
  const [mode, setMode] = useState<"chat" | "search">("chat");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [found, setFound] = useState<Product[]>([]);
  const [reply, setReply] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const query = text.trim();
    if (!query) return;
    setBusy(true);
    setText("");
    try {
      if (mode === "search") {
        const result = await aiService.searchProductsWithAi(query);
        setReply(result.data.reply);
        setFound(result.data.products);
      } else {
        setTurns((current) => [...current, { role: "user", text: query }]);
        const result = await aiService.sendChatMessage(query, conversationId);
        setConversationId(result.data.conversationId);
        setTurns((current) => [
          ...current,
          { role: "assistant", text: result.data.answer, products: result.data.products },
        ]);
      }
    } catch (reason) {
      showToast(errorText(reason), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageBanner title="Tư vấn" />
      <div className="wrap" style={{ padding: "48px 0 64px", display: "grid", gap: 16 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <button type="button" onClick={() => setMode("chat")}>Chat</button>
          <button type="button" onClick={() => setMode("search")}>Tìm bằng AI</button>
        </div>
        {mode === "search" && reply ? <p>{reply}</p> : null}
        {mode === "chat"
          ? turns.map((turn, index) => (
              <article key={`${turn.role}-${index}`}>
                <strong>{turn.role === "user" ? "Bạn" : "Trợ lý"}</strong>
                <p>{turn.text}</p>
                {turn.products?.length ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
                    {turn.products.map((product) => (
                      <ProductCard key={product.id} product={toCard(product)} />
                    ))}
                  </div>
                ) : null}
              </article>
            ))
          : null}
        {mode === "search" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {found.map((product) => (
              <ProductCard key={product.id} product={toCard(product)} />
            ))}
          </div>
        ) : null}
        <form onSubmit={submit} style={{ display: "flex", gap: 12 }}>
          <input
            aria-label="Nội dung"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={mode === "search" ? "Mô tả sản phẩm cần tìm" : "Hỏi về sản phẩm"}
            style={{ flex: 1 }}
          />
          <Button type="submit" variant="primary" disabled={busy}>Gửi</Button>
        </form>
        <Link to="/shop">Tìm theo bộ lọc thường</Link>
      </div>
    </>
  );
}
