import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function PageState({
  loading,
  error,
  empty,
  backTo = "/shop",
  backLabel = "Quay lại",
  emptyAction,
}: {
  loading?: boolean;
  error?: string;
  empty?: ReactNode;
  backTo?: string;
  backLabel?: string;
  emptyAction?: ReactNode;
}) {
  if (loading) return <p>Đang tải…</p>;
  if (error) {
    return (
      <div className="stack">
        <p>{error}</p>
        <Link to={backTo}>{backLabel}</Link>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="stack">
        <p>{empty}</p>
        {emptyAction}
      </div>
    );
  }
  return null;
}
