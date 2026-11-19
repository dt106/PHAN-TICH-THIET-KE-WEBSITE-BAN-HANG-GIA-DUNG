import React from 'react';

export interface TypingIndicatorProps {
  userName?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  userName = 'Khách hàng',
}) => {
  return (
    <div className="flex justify-start py-1 animate-fadeIn">
      <div className="max-w-[88%] sm:max-w-[75%]">
        <div className="mb-1 flex items-center gap-1.5 text-xs text-text-muted">
          <span>{userName}</span>
        </div>

        <div className="inline-flex items-center gap-2.5 rounded-2xl rounded-bl-sm border border-border-default bg-bg-surface px-4 py-2.5 text-xs text-text-secondary shadow-sm">
          <div className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-accent-primary animate-bounce [animation-delay:-0.3s]" />
            <span className="size-1.5 rounded-full bg-accent-primary animate-bounce [animation-delay:-0.15s]" />
            <span className="size-1.5 rounded-full bg-accent-primary animate-bounce" />
          </div>
          <span className="italic text-text-muted">{userName} đang soạn tin...</span>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
