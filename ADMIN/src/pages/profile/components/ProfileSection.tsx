
import type { ReactNode } from 'react';

interface ProfileSectionProps {
  title: string;
  description: string;
  children: ReactNode;
  action?: ReactNode;
}

export default function ProfileSection({
  title,
  description,
  children,
  action,
}: ProfileSectionProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#303332] bg-bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#303332] px-5 py-5 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text-primary">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-text-muted">
            {description}
          </p>
        </div>
        {action}
      </div>

      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}
