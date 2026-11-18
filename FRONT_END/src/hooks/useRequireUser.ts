import { useLocation, useNavigate } from "react-router-dom";
import { showToast } from "../components/common/Toast/showToast.tsx";
import { useAuth } from "../contexts/useAuth.ts";

export function useRequireUser() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return () => {
    if (user) return true;
    const next = `${location.pathname}${location.search}`;
    showToast("Đăng nhập để tiếp tục.", "warning");
    navigate(`/login?next=${encodeURIComponent(next)}`);
    return false;
  };
}
