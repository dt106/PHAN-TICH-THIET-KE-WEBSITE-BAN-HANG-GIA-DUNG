import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "../common/index.ts";
import { aiApi } from "../../services/api.ts";
import { errorMessage } from "../../services/http.ts";
import type { AiChatProduct } from "../../types/api.ts";
import { formatPrice } from "../../utils/money.ts";
import panels from "../../styles/panels.module.css";

const sessionKey = "furniro-ai-session";

function sessionId() {
  const existing = localStorage.getItem(sessionKey);
  if (existing && existing.length >= 16) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(sessionKey, created);
  return created;
}

type Bubble = { role: "user" | "assistant"; content: string; products?: AiChatProduct[] };

export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const sid = sessionId();
    aiApi
      .conversations(sid)
      .then(async (result) => {
        const first = result.data?.[0];
        if (!first || !active) return;
        const detail = await aiApi.conversation(first.conversationId, sid);
        if (!active) return;
        setConversationId(detail.data.conversationId);
        setMessages(detail.data.messages.map((item) => ({ role: item.role, content: item.content })));
      })
      .catch((reason) => {
        if (active) setError(errorMessage(reason));
      });
    return () => {
      active = false;
    };
  }, [open]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const message = text.trim();
    if (!message) return;
    setText("");
    setError(null);
    setMessages((current) => [...current, { role: "user", content: message }]);
    setLoading(true);
    try {
      const result = await aiApi.chat({
        message,
        sessionId: sessionId(),
        conversationId: conversationId ?? undefined,
      });
      setConversationId(result.data.conversationId);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: result.data.answer, products: result.data.products },
      ]);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  async function clearChat() {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    try {
      await aiApi.deleteConversation(conversationId, sessionId());
      setConversationId(null);
      setMessages([]);
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  return (
    <>
      {open ? (
        <section className={panels.chat} aria-label="Trò chuyện với trợ lý">
          <header className={panels.chatHead}>
            <strong>Trợ lý sản phẩm</strong>
            <button type="button" className={panels.switch} onClick={() => void clearChat()}>
              Xóa hội thoại
            </button>
          </header>
          <div className={panels.chatLog}>
            {messages.length === 0 ? <p className={panels.muted}>Hỏi về sản phẩm, giá hoặc cách chọn đồ.</p> : null}
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`}>
                <p className={`${panels.bubble} ${message.role === "user" ? panels.bubbleMine : ""}`}>{message.content}</p>
                {message.products && message.products.length > 0 ? (
                  <div className={panels.products}>
                    {message.products.map((product) => (
                      <Link key={product._id} to={`/shop/${product.slug}`} onClick={() => setOpen(false)}>
                        {product.name} — {formatPrice(product.salePrice ?? product.basePrice)}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {loading ? <p>Đang trả lời...</p> : null}
            {error ? <p className={panels.alert}>{error}</p> : null}
          </div>
          <form className={panels.chatForm} onSubmit={(event) => void send(event)}>
            <input
              aria-label="Tin nhắn"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Nhập câu hỏi"
            />
            <Button type="submit" size="sm" loading={loading}>
              Gửi
            </Button>
          </form>
        </section>
      ) : null}
      <button type="button" className={panels.chatToggle} onClick={() => setOpen((current) => !current)}>
        {open ? "Đóng chat" : "Chat AI"}
      </button>
    </>
  );
}
