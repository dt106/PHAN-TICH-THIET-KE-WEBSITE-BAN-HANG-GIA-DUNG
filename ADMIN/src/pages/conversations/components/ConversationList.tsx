
import { CircleUserRound, Search } from 'lucide-react';

import StatusBadge from '../../../components/shared/StatusBadge';
import type {
  ConversationListItem,
  ConversationStatus,
} from '../../../types/conversation.types';

interface ConversationListProps {
  conversations: ConversationListItem[];
  selectedId: string | number | null;
  search: string;
  statusFilter: 'all' | ConversationStatus;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: 'all' | ConversationStatus) => void;
  onSelect: (conversation: ConversationListItem) => void;
}

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

function formatTime(value: string | null) {
  if (!value) return 'Chưa có tin nhắn';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

export default function ConversationList({
  conversations,
  selectedId,
  search,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onSelect,
}: ConversationListProps) {
  return (
    <section className="flex min-h-[520px] flex-col overflow-hidden rounded-xl border border-border-default bg-bg-surface">
      <div className="space-y-3 border-b border-border-default p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-text-primary">
            Hội thoại
          </h2>
          <span className="text-xs text-text-muted">
            {conversations.length} cuộc trò chuyện
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-app px-3">
          <Search size={16} className="shrink-0 text-text-muted" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm khách hàng..."
            aria-label="Tìm hội thoại"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) =>
            onStatusFilterChange(
              event.target.value as 'all' | ConversationStatus,
            )
          }
          aria-label="Lọc trạng thái hội thoại"
          className="w-full rounded-lg border border-border-default bg-bg-app px-3 py-2 text-sm text-text-primary outline-none"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="open">Đang xử lý</option>
          <option value="pending">Chờ tiếp nhận</option>
          <option value="closed">Đã đóng</option>
        </select>
      </div>

      <div className="max-h-[680px] flex-1 space-y-2 overflow-y-auto p-3">
        {conversations.length === 0 ? (
          <div className="py-10 text-center">
            <CircleUserRound
              size={30}
              className="mx-auto text-text-muted"
            />
            <p className="mt-3 text-sm text-text-secondary">
              Không tìm thấy hội thoại phù hợp.
            </p>
          </div>
        ) : (
          conversations.map((conversation) => {
            const isSelected = conversation.id === selectedId;

            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => onSelect(conversation)}
                aria-pressed={isSelected}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  isSelected
                    ? 'border-accent-primary/50 bg-bg-hover'
                    : 'border-transparent hover:bg-bg-hover'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-elevated text-text-secondary">
                    {conversation.customer_avatar ? (
                      <img
                        src={conversation.customer_avatar}
                        alt={conversation.customer_name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <CircleUserRound size={21} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {conversation.customer_name}
                      </p>

                      {conversation.admin_unread_count > 0 && (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-primary text-xs font-semibold text-black">
                          {conversation.admin_unread_count}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 truncate text-xs text-text-secondary">
                      {conversation.subject || 'Hội thoại mới'}
                    </p>

                    <p className="mt-2 truncate text-xs text-text-muted">
                      {conversation.last_message_preview || 'Chưa có tin nhắn'}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <StatusBadge
                        status={statusLabels[conversation.status]}
                        variant={statusVariants[conversation.status]}
                      />
                      <span className="text-[11px] text-text-muted">
                        {formatTime(conversation.last_message_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
