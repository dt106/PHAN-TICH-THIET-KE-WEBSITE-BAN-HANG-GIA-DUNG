/**
 * FILE: FRONT_END/src/components/chat/CustomerChatWidget.tsx
 *
 * CỬA SỔ CHAT HỖ TRỢ KHÁCH HÀNG (FLOATING CHAT WIDGET)
 * - Nút tròn nổi cố định góc dưới bên phải màn hình.
 * - Badge đỏ thông báo số lượng tin nhắn chưa đọc từ cửa hàng.
 * - Popup hội thoại kết nối trực tiếp với Tư vấn viên qua Socket.IO Real-Time.
 * - Tự động tải ca chat gần nhất hoặc tạo ca mới khi gửi tin nhắn đầu tiên.
 * - Tự động cuộn xuống cuối khi có tin nhắn mới.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  MessageCircle,
  X,
  Minus,
  Send,
  Headphones,
  LogIn,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../contexts/useAuth.ts";
import { readToken } from "../../services/session.ts";
import { customerConversationService } from "../../services/customerConversation.service.ts";
import {
  getSocket,
  connectSocket,
  joinConversation,
  leaveConversation,
} from "../../services/socket/socketClient.ts";
import { playNotificationChime } from "../../utils/chatSound.ts";
import type { CustomerConversation, ChatMessage } from "../../types/chat.types.ts";
import styles from "./CustomerChatWidget.module.css";

export function CustomerChatWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState<CustomerConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Trạng thái chỉ báo đối tác (Tư vấn viên CSKH) đang soạn tin nhắn
  const [isAdminTyping, setIsAdminTyping] = useState(false);
  const [adminTypingName, setAdminTypingName] = useState("Tư vấn viên");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const conversationRef = useRef<CustomerConversation | null>(null);
  const isOpenRef = useRef(isOpen);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const adminTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  conversationRef.current = conversation;
  isOpenRef.current = isOpen;

  // Tự động cuộn xuống tin nhắn mới nhất
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  // 1. Tải cuộc hội thoại hiện tại của khách hàng khi đăng nhập
  const loadCurrentConversation = useCallback(async () => {
    if (!user || !readToken()) {
      setConversation(null);
      setMessages([]);
      setUnreadCount(0);
      return;
    }

    try {
      setIsLoading(true);
      const currentConv = await customerConversationService.getCurrentConversation();

      if (currentConv) {
        setConversation(currentConv);
        setUnreadCount(currentConv.unreadCount || currentConv.customerUnreadCount || 0);

        // Gia nhập socket room của ca chat
        joinConversation(currentConv.id);

        // Lấy danh sách tin nhắn
        const history = await customerConversationService.getMessages(currentConv.id);
        setMessages(history);

        // Nếu widget đang mở, đánh dấu đã đọc
        if (isOpenRef.current && (currentConv.unreadCount > 0 || (currentConv.customerUnreadCount ?? 0) > 0)) {
          await customerConversationService.markRead(currentConv.id);
          setUnreadCount(0);
        }
      } else {
        setConversation(null);
        setMessages([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.warn("⚠️ [CustomerChatWidget] Không thể tải ca chat hiện tại:", err);
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollToBottom(false), 100);
    }
  }, [user, scrollToBottom]);

  // Tải hội thoại khi user đăng nhập hoặc khởi tạo
  useEffect(() => {
    loadCurrentConversation();
  }, [loadCurrentConversation]);

  // 2. Quản lý kết nối Socket.IO Real-time
  useEffect(() => {
    const token = readToken();
    if (!user || !token) {
      return;
    }

    const socket = connectSocket();

    // Sự kiện kết nối lại: gia nhập lại room ca chat nếu có
    const handleConnect = () => {
      const activeConv = conversationRef.current;
      if (activeConv?.id) {
        joinConversation(activeConv.id);
      }
    };

    // Sự kiện nhận tin nhắn mới
    const handleNewMessage = (newMsg: ChatMessage) => {
      const activeConv = conversationRef.current;
      const msgConvId = newMsg.conversationId || newMsg.conversation_id;

      // Nếu tin nhắn thuộc về cuộc hội thoại hiện tại
      if (activeConv && msgConvId === activeConv.id) {
        setMessages((prev) => {
          // Tránh trùng lặp tin nhắn
          const msgId = newMsg.id || newMsg._id;
          const exists = prev.some((m) => (m.id || m._id) === msgId);
          if (exists) return prev;
          return [...prev, newMsg];
        });

        // Tắt trạng thái CSKH đang gõ khi nhận tin nhắn
        setIsAdminTyping(false);
        if (adminTypingTimeoutRef.current) {
          clearTimeout(adminTypingTimeoutRef.current);
        }

        // Phát chuông báo nếu tin nhắn đến từ tư vấn viên CSKH
        const role = newMsg.senderRole || newMsg.sender_role;
        if (role === "admin") {
          playNotificationChime();
        }

        // Nếu widget đang mở, tự động mark read
        if (isOpenRef.current) {
          customerConversationService.markRead(activeConv.id).catch(() => {});
          setUnreadCount(0);
        } else {
          // Nếu widget đang đóng và tin nhắn từ Admin, tăng badge unread
          if (role === "admin") {
            setUnreadCount((prev) => prev + 1);
          }
        }

        setTimeout(() => scrollToBottom(true), 50);
      }
    };

    // Sự kiện đối tác đang soạn tin nhắn
    const handleUserTyping = (payload: {
      userId: string;
      userName?: string;
      role?: string;
      conversationId?: string;
      isTyping: boolean;
    }) => {
      const activeConv = conversationRef.current;
      if (!activeConv || !payload.conversationId || payload.conversationId !== activeConv.id) {
        return;
      }

      // Bỏ qua nếu là sự kiện của chính user
      if (payload.userId === user?.id) return;

      if (payload.isTyping) {
        setIsAdminTyping(true);
        setAdminTypingName(
          payload.userName ||
          activeConv.assignedAdminName ||
          "Tư vấn viên Furniro"
        );

        if (adminTypingTimeoutRef.current) {
          clearTimeout(adminTypingTimeoutRef.current);
        }

        // Tự động hết hạn trạng thái typing sau 3500ms
        adminTypingTimeoutRef.current = setTimeout(() => {
          setIsAdminTyping(false);
        }, 3500);

        setTimeout(() => scrollToBottom(true), 50);
      } else {
        setIsAdminTyping(false);
        if (adminTypingTimeoutRef.current) {
          clearTimeout(adminTypingTimeoutRef.current);
        }
      }
    };

    // Sự kiện cập nhật thông tin hội thoại
    const handleConversationUpdated = (updatedConv: any) => {
      const activeConv = conversationRef.current;
      const updatedId = updatedConv.id || updatedConv._id;

      if (activeConv && updatedId === activeConv.id) {
        setConversation((prev) => (prev ? { ...prev, ...updatedConv } : updatedConv));
      }
    };

    // Sự kiện cập nhật trạng thái cuộc hội thoại (open / closed)
    const handleStatusChanged = (payload: { conversationId: string; status: any }) => {
      const activeConv = conversationRef.current;
      if (activeConv && payload.conversationId === activeConv.id) {
        setConversation((prev) =>
          prev ? { ...prev, status: payload.status } : null
        );
      }
    };

    socket.on("connect", handleConnect);
    socket.on("new_message", handleNewMessage);
    socket.on("conversation_updated", handleConversationUpdated);
    socket.on("conversation_status_changed", handleStatusChanged);
    socket.on("user_typing", handleUserTyping);

    // Nếu đã có conversation sẵn, emit join ngay
    if (conversationRef.current?.id) {
      joinConversation(conversationRef.current.id);
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("new_message", handleNewMessage);
      socket.off("conversation_updated", handleConversationUpdated);
      socket.off("conversation_status_changed", handleStatusChanged);
      socket.off("user_typing", handleUserTyping);

      if (adminTypingTimeoutRef.current) {
        clearTimeout(adminTypingTimeoutRef.current);
      }
    };
  }, [user, scrollToBottom]);

  // 3. Khi mở popup widget: mark read và scroll
  const handleToggleOpen = async () => {
    const nextState = !isOpen;
    setIsOpen(nextState);

    if (nextState) {
      // Khi mở ra: nếu có unreadCount, đánh dấu đã đọc
      if (conversation?.id && unreadCount > 0) {
        try {
          await customerConversationService.markRead(conversation.id);
          setUnreadCount(0);
        } catch {
          // Bỏ qua lỗi mạng không trọng yếu
        }
      }
      setTimeout(() => {
        scrollToBottom(false);
        inputRef.current?.focus();
      }, 100);
    }
  };

  // 4. Gửi tin nhắn
  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || inputText).trim();
    if (!content || isSending) return;

    if (!user) {
      navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }

    try {
      setIsSending(true);
      setInputText("");

      // Tắt trạng thái đang gõ ngay khi gửi tin nhắn
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current && conversation?.id) {
        isTypingRef.current = false;
        const socket = getSocket();
        if (socket?.connected) {
          socket.emit("typing_stop", {
            conversationId: conversation.id,
            userName: user?.name || "Khách hàng",
          });
        }
      }

      if (!conversation) {
        // Chưa có ca hội thoại -> Tạo mới ca chat với tin nhắn đầu tiên
        const result = await customerConversationService.createConversation({
          subject: "Hỗ trợ khách hàng Furniro",
          firstMessage: content,
        });

        setConversation(result.conversation);
        setMessages([result.message]);

        // Gia nhập room socket của ca mới
        joinConversation(result.conversation.id);
      } else {
        // Đã có ca hội thoại -> Gửi tin nhắn vào ca
        const newMsg = await customerConversationService.sendMessage(conversation.id, {
          content,
          messageType: "text",
        });

        setMessages((prev) => {
          const msgId = newMsg.id || newMsg._id;
          const exists = prev.some((m) => (m.id || m._id) === msgId);
          if (exists) return prev;
          return [...prev, newMsg];
        });

        // Nếu ca chat trước đó là "closed", server tự động re-open thành "open"
        if (conversation.status === "closed") {
          setConversation((prev) => (prev ? { ...prev, status: "open" } : null));
        }
      }

      setTimeout(() => {
        scrollToBottom(true);
        inputRef.current?.focus();
      }, 50);
    } catch (err) {
      console.error("❌ [CustomerChatWidget] Lỗi gửi tin nhắn:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Xử lý sự kiện gõ phím kèm debounce 1500ms
  const handleInputChange = (value: string) => {
    setInputText(value);

    const activeConv = conversationRef.current;
    if (!activeConv?.id) return;

    const socket = getSocket();
    if (!socket?.connected) return;

    // Khi người dùng bắt đầu gõ ký tự
    if (!isTypingRef.current && value.trim().length > 0) {
      isTypingRef.current = true;
      socket.emit("typing_start", {
        conversationId: activeConv.id,
        userName: user?.name || "Khách hàng",
      });
    }

    // Làm mới timeout debounce 1500ms
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit("typing_stop", {
        conversationId: activeConv.id,
        userName: user?.name || "Khách hàng",
      });
    }, 1500);
  };

  // Rời room & hủy typing khi unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current && conversationRef.current?.id) {
        isTypingRef.current = false;
        const socket = getSocket();
        if (socket?.connected) {
          socket.emit("typing_stop", {
            conversationId: conversationRef.current.id,
          });
        }
      }
      if (conversationRef.current?.id) {
        leaveConversation(conversationRef.current.id);
      }
    };
  }, []);

  // Format thời gian tin nhắn
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const quickSuggestions = [
    "Tôi cần tư vấn mẫu bàn ghế phòng khách",
    "Kiểm tra giúp tôi thời gian giao hàng",
    "Chính sách bảo hành và đổi trả thế nào?",
  ];

  return (
    <div className={styles.widgetContainer}>
      {/* 1. NÚT TRÒN NỔI (FLOATING LAUNCHER BUTTON) */}
      <button
        type="button"
        className={styles.launcherButton}
        onClick={handleToggleOpen}
        aria-label={isOpen ? "Đóng chat hỗ trợ" : "Mở chat hỗ trợ khách hàng"}
        title="Tư vấn trực tuyến"
      >
        {isOpen ? <X size={26} /> : <MessageCircle size={28} />}

        {/* Badge thông báo số tin chưa đọc */}
        {!isOpen && unreadCount > 0 && (
          <span className={styles.unreadBadge}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* 2. CỬA SỔ POPUP CHAT */}
      {isOpen && (
        <aside className={styles.chatWindow} aria-label="Cửa sổ hỗ trợ trực tuyến">
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerInfo}>
              <div className={styles.headerAvatar}>
                <Headphones size={20} />
              </div>
              <div className={styles.headerText}>
                <span className={styles.headerTitle}>Furniro CSKH</span>
                <span className={styles.headerStatus}>
                  <span className={styles.onlineDot} />
                  {conversation?.assignedAdminName
                    ? conversation.assignedAdminName
                    : "Tư vấn viên trực tuyến"}
                </span>
              </div>
            </div>

            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.iconButton}
                onClick={handleToggleOpen}
                title="Thu nhỏ"
                aria-label="Thu nhỏ"
              >
                <Minus size={18} />
              </button>
              <button
                type="button"
                className={styles.iconButton}
                onClick={handleToggleOpen}
                title="Đóng"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className={styles.body}>
            {!user ? (
              /* TRƯỜNG HỢP: Khách hàng chưa đăng nhập */
              <div className={styles.authPrompt}>
                <div className={styles.authIconWrap}>
                  <Sparkles size={28} />
                </div>
                <h4 className={styles.authTitle}>Xin chào quý khách!</h4>
                <p className={styles.authText}>
                  Vui lòng đăng nhập để bắt đầu trò chuyện với nhân viên CSKH
                  và nhận hỗ trợ đơn hàng nhanh nhất.
                </p>
                <button
                  type="button"
                  className={styles.authLoginButton}
                  onClick={() => {
                    setIsOpen(false);
                    navigate(
                      `/login?next=${encodeURIComponent(
                        location.pathname + location.search
                      )}`
                    );
                  }}
                >
                  <LogIn
                    size={16}
                    style={{ display: "inline-block", marginRight: "6px" }}
                  />
                  Đăng nhập ngay
                </button>
              </div>
            ) : isLoading ? (
              /* TRƯỜNG HỢP: Đang tải dữ liệu */
              <div className={styles.loadingSpinner}>
                <span>Đang tải đoạn hội thoại...</span>
              </div>
            ) : messages.length === 0 ? (
              /* TRƯỜNG HỢP: Chưa có tin nhắn nào trong ca */
              <div className={styles.welcomeCard}>
                <h4 className={styles.welcomeTitle}>
                  Chào {user.name || "bạn"} 👋
                </h4>
                <p className={styles.welcomeText}>
                  Nhân viên tư vấn Furniro luôn sẵn sàng giải đáp mọi thắc mắc
                  về sản phẩm và đơn hàng của bạn.
                </p>

                <div className={styles.suggestionsTitle}>Gợi ý câu hỏi nhanh:</div>
                <div className={styles.suggestionChips}>
                  {quickSuggestions.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={styles.chipButton}
                      onClick={() => handleSendMessage(item)}
                    >
                      💬 {item}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* TRƯỜNG HỢP: Hiển thị danh sách tin nhắn */
              <>
                {messages.map((msg, index) => {
                  const role = msg.senderRole || msg.sender_role || "customer";
                  const msgType = msg.messageType || msg.message_type || "text";
                  const isSystem = msgType === "system" || role === "system";
                  const isCustomer = role === "customer";

                  if (isSystem) {
                    return (
                      <div key={msg.id || msg._id || index} className={styles.systemMessage}>
                        {msg.content}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id || msg._id || index}
                      className={`${styles.messageRow} ${
                        isCustomer ? styles.customerRow : styles.adminRow
                      }`}
                    >
                      {!isCustomer && (
                        <div className={styles.adminSenderInfo}>
                          <div className={styles.adminAvatarSmall}>
                            {msg.senderName ? msg.senderName.charAt(0).toUpperCase() : "A"}
                          </div>
                          <span className={styles.adminSenderName}>
                            {msg.senderName || "Tư vấn viên Furniro"}
                          </span>
                        </div>
                      )}

                      <div
                        className={`${styles.bubble} ${
                          isCustomer ? styles.customerBubble : styles.adminBubble
                        }`}
                      >
                        <div>{msg.content}</div>
                        <div className={styles.messageTime}>
                          {formatTime(msg.createdAt || msg.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {conversation?.status === "closed" && (
                  <div className={styles.closedNotice}>
                    ℹ️ Cuộc hội thoại này đã kết thúc. Gửi tin nhắn mới sẽ tự động mở lại hỗ trợ!
                  </div>
                )}

                {/* Chỉ báo Tư vấn viên CSKH đang soạn tin nhắn */}
                {isAdminTyping && (
                  <div className={styles.typingRow}>
                    <div className={styles.adminAvatarSmall}>
                      {adminTypingName.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.typingBubble}>
                      <div className={styles.typingDots}>
                        <span className={styles.typingDot} />
                        <span className={styles.typingDot} />
                        <span className={styles.typingDot} />
                      </div>
                      <span className={styles.typingLabel}>
                        {adminTypingName} đang soạn tin...
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Footer Input */}
          {user && (
            <div className={styles.footer}>
              <form
                className={styles.inputForm}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  className={styles.inputField}
                  placeholder="Nhập nội dung cần hỗ trợ..."
                  value={inputText}
                  onChange={(e) => handleInputChange(e.target.value)}
                  disabled={isSending}
                />
                <button
                  type="submit"
                  className={styles.sendButton}
                  disabled={isSending || !inputText.trim()}
                  title="Gửi tin nhắn"
                  aria-label="Gửi tin nhắn"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}

export default CustomerChatWidget;
