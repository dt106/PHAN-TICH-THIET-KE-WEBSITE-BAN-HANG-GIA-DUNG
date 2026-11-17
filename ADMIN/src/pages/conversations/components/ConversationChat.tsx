
import { useState, type FormEvent } from 'react';
import {
  CheckCheck,
  CircleUserRound,
  MessageCircle,
  Send,
  UserRoundCog,
  XCircle,
} from 'lucide-react';

import StatusBadge from '../../../components/shared/StatusBadge';
import { Button } from '../../../components/ui/buttons/Button';

import type {
  ConversationListItem,
  ConversationStatus,
  MessageView,
} from '../../../types/conversation.types';

interface ConversationChatProps {
  conversation: ConversationListItem;
  messages: MessageView[];
  onSendMessage: (content: string) => void;
  onAssignAdmin: (adminId: string | number | null) => void;
  onToggleStatus: () => void;
}

const ADMIN_OPTIONS = [
  { id: 1, name: 'Admin' },
  { id: 2, name: 'Nhân viên CSKH' },
];

const statusLabels: Record<ConversationStatus, string> = {
  open: 'Đang xử lý',
  pending: 'Chờ tiếp nhận',
  closed: 'Đã đóng',
};

const statusVariants: Record<
  ConversationStatus,
  'success' | 'warning' | 'neutral'
> = {
  open: 'success',
  pending: 'warning',
  closed: 'neutral',
};

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function ConversationChat({
  conversation,
  messages,
  onSendMessage,
  onAssignAdmin,
  onToggleStatus,
}: ConversationChatProps) {
  const [reply, setReply] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const content = reply.trim();

    if (!content || conversation.status === 'closed') return;

    onSendMessage(content);
    setReply('');
  };

  return (
    <section className="flex min-h-[600px] min-w-0 flex-col overflow-hidden rounded-xl border border-border-default bg-bg-surface">
      {/* Thông tin khách hàng */}
      <header className="flex flex-col gap-4 border-b border-border-default p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-elevated text-text-secondary">
            {conversation.customer_avatar ? (
              <img
                src={conversation.customer_avatar}
                alt={conversation.customer_name}
                className="size-full object-cover"
              />
            ) : (
              <CircleUserRound size={23} />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="truncate font-semibold text-text-primary">
              {conversation.customer_name}
            </h2>

            <p className="truncate text-xs text-text-secondary">
              {conversation.customer_email}
            </p>

            <p className="mt-1 truncate text-xs text-text-muted">
              {conversation.subject || 'Hội thoại khách hàng'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            status={statusLabels[conversation.status]}
            variant={statusVariants[conversation.status]}
          />

          <Button type="button" variant="secondary" onClick={onToggleStatus}>
            {conversation.status === 'closed' ? (
              <>
                <CheckCheck size={16} className="mr-2" />
                Mở lại
              </>
            ) : (
              <>
                <XCircle size={16} className="mr-2" />
                Đóng hội thoại
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Phân công nhân viên */}
      <div className="flex flex-col gap-3 border-b border-border-default px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <UserRoundCog size={17} />
          <span>Phân công cho</span>
        </div>

        <select
          value={conversation.assigned_admin_id ?? ''}
          onChange={(event) =>
            onAssignAdmin(
              event.target.value || null,
            )
          }
          aria-label="Phân công nhân viên"
          className="w-full rounded-lg border border-border-default bg-bg-app px-3 py-2 text-sm text-text-primary outline-none sm:w-auto sm:min-w-52"
        >
          <option value="">Chưa phân công</option>

          {ADMIN_OPTIONS.map((admin) => (
            <option key={admin.id} value={admin.id}>
              {admin.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tin nhắn */}
      <div className="flex-1 space-y-4 overflow-y-auto bg-bg-app/40 p-4 sm:p-6">
        {messages.length === 0 ? (
          <div className="py-12 text-center">
            <MessageCircle
              size={32}
              className="mx-auto text-text-muted"
            />
            <p className="mt-3 text-sm text-text-secondary">
              Chưa có tin nhắn trong hội thoại này.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isAdmin = message.sender_role === 'admin';

            return (
              <div
                key={message.id}
                className={`flex ${
                  isAdmin ? 'justify-end' : 'justify-start'
                }`}
              >
                <div className="max-w-[88%] sm:max-w-[75%]">
                  <div
                    className={`mb-1 flex flex-wrap items-center gap-2 text-xs text-text-muted ${
                      isAdmin ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span>{message.sender_name}</span>
                    <span>{formatDateTime(message.created_at)}</span>
                  </div>

                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                      isAdmin
                        ? 'rounded-br-sm bg-accent-primary text-black'
                        : 'rounded-bl-sm border border-border-default bg-bg-surface text-text-primary'
                    }`}
                  >
                    {message.content || (
                      <span className="italic opacity-70">
                        Tin nhắn không có nội dung văn bản.
                      </span>
                    )}
                  </div>

                  {message.message_type !== 'text' && (
                    <p className="mt-1 text-xs text-text-muted">
                      Loại tin nhắn: {message.message_type}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Khung trả lời */}
      <footer className="border-t border-border-default p-4">
        {conversation.status === 'closed' ? (
          <div className="rounded-lg border border-border-default bg-bg-app p-4 text-center">
            <p className="text-sm text-text-secondary">
              Hội thoại đã đóng. Mở lại để tiếp tục trả lời khách hàng.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder="Nhập nội dung trả lời khách hàng..."
              rows={3}
              aria-label="Nội dung trả lời"
              className="w-full resize-y rounded-xl border border-border-default bg-bg-app px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent-primary"
            />

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-text-muted">
                Tin nhắn được lưu trong mock state.
              </p>

              <Button type="submit" disabled={!reply.trim()}>
                <Send size={16} className="mr-2" />
                Gửi trả lời
              </Button>
            </div>
          </form>
        )}
      </footer>
    </section>
  );
}
