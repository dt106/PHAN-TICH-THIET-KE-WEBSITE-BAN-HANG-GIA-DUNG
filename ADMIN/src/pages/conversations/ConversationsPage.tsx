import { useMemo, useState } from 'react';
import { MessageCircle } from 'lucide-react';

import ConversationList from './components/ConversationList';
import ConversationChat from './components/ConversationChat';

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

export default function ConversationsPage() {
  const [conversations, setConversations] =
    useState<ConversationListItem[]>(conversationsMock);

  const [messages, setMessages] =
    useState<MessageView[]>(conversationMessagesMock);

  const [selectedId, setSelectedId] = useState<number | null>(
    conversationsMock[0]?.id ?? null,
  );

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | ConversationStatus
  >('all');

  const selectedConversation =
    conversations.find((item) => item.id === selectedId) ?? null;

  const visibleConversations = useMemo(() => {
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
  }, [conversations, search, statusFilter]);

  const selectedMessages = useMemo(
    () =>
      messages
        .filter((message) => message.conversation_id === selectedId)
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime(),
        ),
    [messages, selectedId],
  );

  const stats = useMemo(
    () => ({
      total: conversations.length,
      open: conversations.filter((item) => item.status === 'open').length,
      pending: conversations.filter((item) => item.status === 'pending').length,
      unread: conversations.reduce(
        (total, item) => total + item.admin_unread_count,
        0,
      ),
    }),
    [conversations],
  );

  const handleSelectConversation = (
    conversation: ConversationListItem,
  ) => {
    setSelectedId(conversation.id);

    setMessages((current) =>
      current.map((message) =>
        message.conversation_id === conversation.id &&
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
        item.id === conversation.id
          ? { ...item, admin_unread_count: 0 }
          : item,
      ),
    );
  };

  const handleSendMessage = (content: string) => {
    if (!selectedConversation) return;

    const now = new Date().toISOString();

    const newMessage: MessageView = {
      id:
        messages.reduce((maxId, message) => Math.max(maxId, message.id), 0) +
        1,
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
        item.id === selectedConversation.id
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
  };

  const handleAssignAdmin = (adminId: number | null) => {
    if (!selectedConversation) return;

    const adminNames: Record<number, string> = {
      1: 'Admin',
      2: 'Nhân viên CSKH',
    };

    setConversations((current) =>
      current.map((item) =>
        item.id === selectedConversation.id
          ? {
            ...item,
            assigned_admin_id: adminId,
            assigned_admin_name: adminId
              ? adminNames[adminId] ?? null
              : null,
            updated_at: new Date().toISOString(),
          }
          : item,
      ),
    );
  };

  const handleToggleStatus = () => {
    if (!selectedConversation) return;

    const nextStatus: ConversationStatus =
      selectedConversation.status === 'closed' ? 'open' : 'closed';

    setConversations((current) =>
      current.map((item) =>
        item.id === selectedConversation.id
          ? {
            ...item,
            status: nextStatus,
            updated_at: new Date().toISOString(),
          }
          : item,
      ),
    );
  };

  return (
    <main className="mx-auto w-full min-w-0 max-w-[1600px] space-y-6 pb-8">
      {/* Page header */}
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent-primary">
            CUSTOMER SUPPORT
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Hội thoại khách hàng
          </h1>

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
                onSendMessage={handleSendMessage}
                onAssignAdmin={handleAssignAdmin}
                onToggleStatus={handleToggleStatus}
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