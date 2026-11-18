import { Navigate, Outlet, useLocation } from "react-router-dom";
import { PageState } from "../components/common/index.ts";
import { useAuth } from "../contexts/useAuth.ts";

export function RequireAuth() {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="wrap section">
        <PageState loading />
      </div>
    );
  }
  if (!user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return <Outlet />;
}
