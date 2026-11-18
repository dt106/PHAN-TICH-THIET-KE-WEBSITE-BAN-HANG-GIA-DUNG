import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/common/index.ts";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { ProductGrid } from "../../components/product/ProductGrid.tsx";
import { useAction } from "../../hooks/useAction.ts";
import { aiService } from "../../services/ai.service.ts";
import type { Product } from "../../types/api.ts";
import styles from "./AssistantPage.module.css";

type Turn = { role: "user" | "assistant"; text: string; products?: Product[] };

export function AssistantPage() {
  const [mode, setMode] = useState<"chat" | "search">("chat");
  const [text, setText] = useState("");
  const [conversationId, setConversationId] = useState<string>();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [found, setFound] = useState<Product[]>([]);
  const [reply, setReply] = useState("");
  const [busy, run] = useAction();

  async function submit(event: FormEvent) {
    event.preventDefault();
    const query = text.trim();
    if (!query) return;
    setText("");
    await run(async () => {
      if (mode === "search") {
        const result = await aiService.searchProductsWithAi(query);
        setReply(result.data.reply);
        setFound(result.data.products);
        return;
      }
      setTurns((current) => [...current, { role: "user", text: query }]);
      const result = await aiService.sendChatMessage(query, conversationId);
      setConversationId(result.data.conversationId);
      setTurns((current) => [
        ...current,
        { role: "assistant", text: result.data.answer, products: result.data.products },
      ]);
    });
  }

  return (
    <>
      <PageBanner title="Tư vấn" />
      <div className={`wrap ${styles.page}`}>
        <div className={styles.tabs} role="tablist">
          <button type="button" role="tab" aria-selected={mode === "chat"} onClick={() => setMode("chat")}>Chat</button>
          <button type="button" role="tab" aria-selected={mode === "search"} onClick={() => setMode("search")}>Tìm bằng AI</button>
        </div>
        <div className={styles.log}>
          {mode === "search" && reply ? <p className={`${styles.bubble} ${styles.assistant}`}>{reply}</p> : null}
          {mode === "chat"
            ? turns.map((turn, index) => (
                <article key={`${turn.role}-${index}`} className={`${styles.bubble} ${styles[turn.role]}`}>
                  <p>{turn.text}</p>
                  {turn.products?.length ? <ProductGrid products={turn.products} /> : null}
                </article>
              ))
            : null}
          {mode === "search" ? <ProductGrid products={found} /> : null}
          {busy ? <p className="muted">Đang trả lời…</p> : null}
        </div>
        <form onSubmit={submit} className={styles.composer}>
          <input
            aria-label="Nội dung"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={mode === "search" ? "Mô tả sản phẩm cần tìm" : "Hỏi về sản phẩm"}
          />
          <Button type="submit" variant="primary" disabled={busy}>Gửi</Button>
        </form>
        <Link to="/shop">Tìm theo bộ lọc thường</Link>
      </div>
    </>
  );
}
