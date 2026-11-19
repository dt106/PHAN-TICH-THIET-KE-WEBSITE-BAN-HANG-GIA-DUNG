import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, MessageCircle } from 'lucide-react';

import ConversationList from './components/ConversationList';
import ConversationChat from './components/ConversationChat';
import { conversationsService } from '../../services/conversations/conversations.service';
import { useAdminChatSocket } from '../../hooks/useAdminChatSocket';
import {
  isChatSoundEnabled,
  setChatSoundEnabled,
  playNotificationChime,
} from '../../utils/chatSound';

import {
  conversationMessagesMock,
  conversationsMock,
} from '../../mocks/conversations.mock';

import type {
  ConversationListItem,
  ConversationStatus,
  MessageView,
} from '../../types/conversation.types';

const CURRENT_ADMIN_ID = 1;
const CURRENT_ADMIN_NAME = 'Admin';

const computeFallbackStats = (items: ConversationListItem[]) => ({
  total: items.length,
  open: items.filter((item) => item.status === 'open').length,
  pending: items.filter((item) => item.status === 'pending').length,
  unread: items.reduce((total, item) => total + item.admin_unread_count, 0),
});

export default function ConversationsPage() {
  const [conversations, setConversations] =
    useState<ConversationListItem[]>([]);

  const [messages, setMessages] =
    useState<MessageView[]>([]);

  const [selectedId, setSelectedId] = useState<string | number | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | ConversationStatus
  >('all');

  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<
    { id: string | number; name: string }[]
  >([]);
  const [kpiStats, setKpiStats] = useState({
    total: 0,
    open: 0,
    pending: 0,
    unread: 0,
  });
  const [isFallback, setIsFallback] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => isChatSoundEnabled());

  // Tích hợp Socket.IO Client lắng nghe và cập nhật thời gian thực
  const {
    isConnected,
    partnerTyping,
    sendTypingStart,
    sendTypingStop,
  } = useAdminChatSocket({
    selectedId,
    setMessages,
    setConversations,
    setKpiStats,
    isFallback,
  });

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setChatSoundEnabled(next);
    if (next) {
      playNotificationChime();
    }
  };

  const refreshStatistics = useCallback(async () => {
    if (isFallback) return;
    try {
      const res = await conversationsService.getStatistics();
      if (res.data) {
        setKpiStats(res.data);
      }
    } catch (error) {
      console.error('Lỗi cập nhật thống kê hội thoại:', error);
    }
  }, [isFallback]);

  const loadConversationMessages = useCallback(
    async (conversationId: string | number) => {
      setLoadingMessages(true);
      try {
        const res = await conversationsService.getConversationMessages(
          conversationId,
        );
        const fetchedMessages = Array.isArray(res.data) ? res.data : [];
        setMessages((current) => {
          const others = current.filter(
            (msg) => String(msg.conversation_id) !== String(conversationId),
          );
          return [...others, ...fetchedMessages];
        });
      } catch (error) {
        console.error('Lỗi tải tin nhắn hội thoại:', error);
        setActionError('Không thể tải lịch sử tin nhắn từ máy chủ.');
      } finally {
        setLoadingMessages(false);
      }
    },
    [],
  );

  const fetchConversationsData = useCallback(
    async (keywordValue: string, statusValue: 'all' | ConversationStatus) => {
      setLoading(true);
      try {
        const [statsRes, listRes] = await Promise.all([
          conversationsService.getStatistics(),
          conversationsService.getConversations({
            status: statusValue,
            keyword: keywordValue.trim() || undefined,
            limit: 100,
          }),
        ]);

        const fetchedConversations = Array.isArray(listRes.data)
          ? listRes.data
          : [];
        const fetchedStats = statsRes.data ?? computeFallbackStats(fetchedConversations);

        setConversations(fetchedConversations);
        setKpiStats(fetchedStats);
        setIsFallback(false);

        setSelectedId((prev) => {
          if (
            prev !== null &&
            fetchedConversations.some((item) => String(item.id) === String(prev))
          ) {
            return prev;
          }
          return fetchedConversations[0]?.id ?? null;
        });
      } catch (error) {
        console.error('Lỗi tải dữ liệu hội thoại từ API, sử dụng dữ liệu dự phòng:', error);
        setIsFallback(true);
        setConversations(conversationsMock);
        setMessages(conversationMessagesMock);
        setKpiStats(computeFallbackStats(conversationsMock));
        setSelectedId((prev) => prev ?? conversationsMock[0]?.id ?? null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    let active = true;

    const loadAssignees = async () => {
      try {
        const res = await conversationsService.getAssignees();
        if (!active) return;

        const list = Array.isArray(res.data)
          ? res.data.map((admin) => ({
              id: admin.id,
              name: admin.name,
            }))
          : [];
        setAssignees(list);
      } catch (error) {
        console.error('Lỗi tải danh sách nhân viên CSKH:', error);
      }
    };

    void loadAssignees();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchConversationsData(search, statusFilter);
    }, 150);

    return () => window.clearTimeout(timer);
  }, [search, statusFilter, fetchConversationsData]);

  useEffect(() => {
    if (isFallback || selectedId === null) return;
    queueMicrotask(() => {
      void loadConversationMessages(selectedId);
    });
  }, [selectedId, isFallback, loadConversationMessages]);

  const selectedConversation =
    conversations.find((item) => String(item.id) === String(selectedId)) ?? null;

  const visibleConversations = useMemo(() => {
    if (!isFallback) {
      return [...conversations].sort((a, b) => {
        const timeA = a.last_message_at
          ? new Date(a.last_message_at).getTime()
          : 0;

        const timeB = b.last_message_at
          ? new Date(b.last_message_at).getTime()
          : 0;

        return timeB - timeA;
      });
    }

    const keyword = search.trim().toLowerCase();

    return conversations
      .filter((conversation) => {
        const matchesSearch =
          !keyword ||
          conversation.customer_name.toLowerCase().includes(keyword) ||
          conversation.customer_email.toLowerCase().includes(keyword) ||
          (conversation.subject ?? '').toLowerCase().includes(keyword) ||
          (conversation.last_message_preview ?? '')
            .toLowerCase()
            .includes(keyword);

        const matchesStatus =
          statusFilter === 'all' || conversation.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const timeA = a.last_message_at
          ? new Date(a.last_message_at).getTime()
          : 0;

        const timeB = b.last_message_at
          ? new Date(b.last_message_at).getTime()
          : 0;

        return timeB - timeA;
      });
  }, [conversations, search, statusFilter, isFallback]);

  const selectedMessages = useMemo(
    () =>
      messages
        .filter((message) => String(message.conversation_id) === String(selectedId))
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime(),
        ),
    [messages, selectedId],
  );

  const stats = useMemo(
    () =>
      isFallback
        ? computeFallbackStats(conversations)
        : kpiStats,
    [isFallback, conversations, kpiStats],
  );

  const handleSelectConversation = async (
    conversation: ConversationListItem,
  ) => {
    setActionError(null);
    const isSameSelected = String(selectedId) === String(conversation.id);
    setSelectedId(conversation.id);

    if (isFallback) {
      setMessages((current) =>
        current.map((message) =>
          String(message.conversation_id) === String(conversation.id) &&
            message.sender_role === 'customer'
            ? {
                ...message,
                is_read: true,
                read_at: message.read_at ?? new Date().toISOString(),
              }
            : message,
        ),
      );

      setConversations((current) =>
        current.map((item) =>
          String(item.id) === String(conversation.id)
            ? { ...item, admin_unread_count: 0 }
            : item,
        ),
      );
      return;
    }

    if (isSameSelected) {
      void loadConversationMessages(conversation.id);
    }

    const previousUnread = conversation.admin_unread_count || 0;
    if (previousUnread > 0) {
      setConversations((current) =>
        current.map((item) =>
          String(item.id) === String(conversation.id)
            ? { ...item, admin_unread_count: 0 }
            : item,
        ),
      );
      setKpiStats((prev) => ({
        ...prev,
        unread: Math.max(0, prev.unread - previousUnread),
      }));
    }

    try {
      await conversationsService.markRead(conversation.id);
      void refreshStatistics();
    } catch (error) {
      console.error('Lỗi đánh dấu đã đọc hội thoại:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation) return;

    setActionError(null);

    if (isFallback) {
      const now = new Date().toISOString();

      const newMessage: MessageView = {
        id:
          messages.reduce(
            (maxId, message) => Math.max(maxId, Number(message.id) || 0),
            0,
          ) + 1,
        conversation_id: selectedConversation.id,
        sender_id: CURRENT_ADMIN_ID,
        message_type: 'text',
        content,
        attachments: null,
        is_read: true,
        read_at: now,
        created_at: now,
        updated_at: now,
        sender_name: CURRENT_ADMIN_NAME,
        sender_role: 'admin',
      };

      setMessages((current) => [...current, newMessage]);

      setConversations((current) =>
        current.map((item) =>
          String(item.id) === String(selectedConversation.id)
            ? {
                ...item,
                status: 'open',
                last_message_at: now,
                last_message_preview: content,
                updated_at: now,
                admin_unread_count: 0,
                assigned_admin_id:
                  item.assigned_admin_id ?? CURRENT_ADMIN_ID,
                assigned_admin_name:
                  item.assigned_admin_name ?? CURRENT_ADMIN_NAME,
              }
            : item,
        ),
      );
      return;
    }

    setSendingMessage(true);
    try {
      const res = await conversationsService.sendMessage(
        selectedConversation.id,
        {
          content,
          messageType: 'text',
        },
      );
      const createdMessage = res.data;

      setMessages((current) => [...current, createdMessage]);

      setConversations((current) =>
        current.map((item) =>
          String(item.id) === String(selectedConversation.id)
            ? {
                ...item,
                status: item.status === 'pending' ? 'open' : item.status,
                last_message_at: createdMessage.created_at,
                last_message_preview: createdMessage.content ?? content,
                updated_at: createdMessage.updated_at,
                assigned_admin_id:
                  item.assigned_admin_id ?? createdMessage.sender_id,
                assigned_admin_name:
                  item.assigned_admin_name ?? createdMessage.sender_name,
              }
            : item,
        ),
      );

      void refreshStatistics();
    } catch (error) {
      console.error('Lỗi gửi tin nhắn phản hồi:', error);
      setActionError(
        error instanceof Error
          ? error.message
          : 'Không thể gửi tin nhắn phản hồi. Vui lòng thử lại.',
      );
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAssignAdmin = async (adminId: string | number | null) => {
    if (!selectedConversation) return;

    setActionError(null);

    if (isFallback) {
      const adminNames: Record<string, string> = {
        '1': 'Admin',
        '2': 'Nhân viên CSKH',
      };

      const adminKey = adminId !== null ? String(adminId) : '';

      setConversations((current) =>
        current.map((item) =>
          String(item.id) === String(selectedConversation.id)
            ? {
                ...item,
                assigned_admin_id: adminId,
                assigned_admin_name: adminId
                  ? adminNames[adminKey] ?? 'Admin'
                  : null,
                updated_at: new Date().toISOString(),
              }
            : item,
        ),
      );
      return;
    }

    try {
      const res = await conversationsService.assignAdmin(
        selectedConversation.id,
        adminId,
      );
      const { conversation: updatedConv, systemMessage } = res.data;

      setConversations((current) =>
        current.map((item) =>
          String(item.id) === String(selectedConversation.id)
            ? {
                ...item,
                ...updatedConv,
              }
            : item,
        ),
      );

      if (systemMessage) {
        setMessages((current) => [...current, systemMessage]);
      }
    } catch (error) {
      console.error('Lỗi phân công nhân viên:', error);
      setActionError(
        error instanceof Error
          ? error.message
          : 'Không thể phân công nhân viên phụ trách.',
      );
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedConversation) return;

    setActionError(null);

    const nextStatus: ConversationStatus =
      selectedConversation.status === 'closed' ? 'open' : 'closed';

    if (isFallback) {
      setConversations((current) =>
        current.map((item) =>
          String(item.id) === String(selectedConversation.id)
            ? {
                ...item,
                status: nextStatus,
                updated_at: new Date().toISOString(),
              }
            : item,
        ),
      );
      return;
    }

    try {
      const res = await conversationsService.updateStatus(
        selectedConversation.id,
        nextStatus,
      );
      const { conversation: updatedConv, systemMessage } = res.data;

      setConversations((current) =>
        current.map((item) =>
          String(item.id) === String(selectedConversation.id)
            ? {
                ...item,
                ...updatedConv,
                status: nextStatus,
              }
            : item,
        ),
      );

      if (systemMessage) {
        setMessages((current) => [...current, systemMessage]);
      }

      void refreshStatistics();
    } catch (error) {
      console.error('Lỗi cập nhật trạng thái hội thoại:', error);
      setActionError(
        error instanceof Error
          ? error.message
          : 'Không thể cập nhật trạng thái hội thoại.',
      );
    }
  };

  return (
    <main className="mx-auto w-full min-w-0 max-w-[1600px] space-y-6 pb-8">
      {/* Page header */}
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent-primary">
            CUSTOMER SUPPORT
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Hội thoại khách hàng
            </h1>

            {/* Chấm tròn trạng thái Real-time Socket.IO */}
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-300 ${
                isConnected
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-border-default bg-bg-surface text-text-muted'
              }`}
              title={
                isConnected
                  ? 'Kênh Socket.IO đang kết nối thời gian thực'
                  : 'Đang kết nối lại Socket.IO...'
              }
            >
              <span
                className={`size-2 rounded-full ${
                  isConnected
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse'
                    : 'bg-text-muted'
                }`}
                aria-hidden="true"
              />
              <span>{isConnected ? 'Real-time đã kết nối' : 'Đang kết nối Real-time'}</span>
            </div>

            {/* Nút bật / tắt chuông âm thanh thông báo */}
            <button
              type="button"
              onClick={handleToggleSound}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-200 cursor-pointer ${
                soundEnabled
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                  : 'border-border-default bg-bg-surface text-text-muted hover:text-text-secondary'
              }`}
              title={
                soundEnabled
                  ? 'Chuông báo: Đang BẬT (Bấm để tắt)'
                  : 'Chuông báo: Đang TẮT (Bấm để bật)'
              }
              aria-label={
                soundEnabled
                  ? 'Tắt âm thanh chuông báo'
                  : 'Bật âm thanh chuông báo'
              }
            >
              {soundEnabled ? (
                <Bell size={13} className="text-amber-400" />
              ) : (
                <BellOff size={13} className="text-text-muted" />
              )}
              <span>{soundEnabled ? 'Chuông: Bật' : 'Chuông: Tắt'}</span>
            </button>
          </div>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
            Quản lý tin nhắn, phản hồi và phân công nhân viên chăm sóc khách hàng.
          </p>
        </div>

        <div className="inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-lg border border-border-default bg-bg-surface px-3.5 text-sm text-text-secondary sm:self-auto">
          <MessageCircle className="h-4 w-4 text-accent-primary" />
          <span>Tổng hội thoại</span>
          <span className="font-semibold tabular-nums text-text-primary">
            {stats.total}
          </span>
        </div>
      </header>

      {/* Statistics */}
      <section
        aria-label="Thống kê hội thoại"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4"
      >
        {[
          {
            label: 'Tổng hội thoại',
            value: stats.total,
            description: 'Tất cả cuộc trò chuyện',
            accent: 'text-text-primary',
            icon: MessageCircle,
            iconStyle: 'bg-bg-elevated text-text-secondary',
          },
          {
            label: 'Đang xử lý',
            value: stats.open,
            description: 'Hội thoại đang mở',
            accent: 'text-accent-primary',
            icon: MessageCircle,
            iconStyle: 'bg-accent-primary/10 text-accent-primary',
          },
          {
            label: 'Chờ tiếp nhận',
            value: stats.pending,
            description: 'Cần nhân viên phản hồi',
            accent: 'text-amber-400',
            icon: MessageCircle,
            iconStyle: 'bg-amber-500/10 text-amber-400',
          },
          {
            label: 'Tin chưa đọc',
            value: stats.unread,
            description: 'Tin nhắn từ khách hàng',
            accent: 'text-cyan-400',
            icon: MessageCircle,
            iconStyle: 'bg-cyan-500/10 text-cyan-400',
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="min-w-0 rounded-xl border border-border-default bg-bg-surface p-4 transition-colors duration-200 hover:border-border-strong sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-text-secondary">
                    {item.label}
                  </p>

                  <p
                    className={`mt-3 text-2xl font-semibold tabular-nums ${item.accent}`}
                  >
                    {item.value}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-text-muted">
                    {item.description}
                  </p>
                </div>

                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.iconStyle}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Conversations workspace */}
      <section className="min-w-0 overflow-hidden rounded-xl border border-border-default bg-bg-surface">
        <div className="border-b border-border-default px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
                <MessageCircle className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <h2 className="text-base font-semibold text-text-primary">
                  Trung tâm hỗ trợ
                </h2>

                <p className="mt-1 text-sm leading-5 text-text-muted">
                  Theo dõi và trả lời hội thoại khách hàng theo thời gian gần nhất.
                </p>
              </div>
            </div>

            {loading && (
              <span className="shrink-0 text-xs text-text-muted">
                Đang đồng bộ...
              </span>
            )}
          </div>

          {actionError && (
            <div
              role="alert"
              className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-xs text-status-danger"
            >
              <span>{actionError}</span>
              <button
                type="button"
                onClick={() => setActionError(null)}
                className="font-medium underline hover:opacity-80"
              >
                Đóng
              </button>
            </div>
          )}
        </div>

        <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 p-4 sm:p-5 xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[350px_minmax(0,1fr)]">
          <div className="min-w-0 overflow-hidden rounded-lg border border-border-default bg-bg-app/30">
            <ConversationList
              conversations={visibleConversations}
              selectedId={selectedId}
              search={search}
              statusFilter={statusFilter}
              onSearchChange={setSearch}
              onStatusFilterChange={setStatusFilter}
              onSelect={handleSelectConversation}
            />
          </div>

          {selectedConversation ? (
            <div className="min-h-[520px] min-w-0 overflow-hidden rounded-lg border border-border-default bg-bg-app/20">
              <ConversationChat
                key={selectedConversation.id}
                conversation={selectedConversation}
                messages={selectedMessages}
                assignees={assignees}
                loadingMessages={loadingMessages}
                sending={sendingMessage}
                isFallback={isFallback}
                isPartnerTyping={
                  Boolean(
                    partnerTyping?.isTyping &&
                    String(partnerTyping.conversationId) === String(selectedConversation.id)
                  )
                }
                partnerTypingName={partnerTyping?.userName}
                onSendMessage={handleSendMessage}
                onAssignAdmin={handleAssignAdmin}
                onToggleStatus={handleToggleStatus}
                onTypingStart={sendTypingStart}
                onTypingStop={sendTypingStop}
              />
            </div>
          ) : (
            <div className="flex min-h-[520px] min-w-0 flex-col items-center justify-center rounded-lg border border-border-default bg-bg-app/20 p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border-default bg-bg-elevated text-text-muted">
                <MessageCircle className="h-5 w-5" />
              </div>

              <h2 className="mt-4 font-semibold text-text-primary">
                Chọn một hội thoại
              </h2>

              <p className="mt-2 max-w-sm text-sm leading-6 text-text-secondary">
                Chọn hội thoại bên trái để xem và trả lời tin nhắn.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}