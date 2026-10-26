
import {
  Search,
  Bell,
  Plus,
  LogOut,
  LogIn,
  User as UserIcon,
  Loader2,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../components/ui/buttons/Button';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const navigate = useNavigate();

  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Đóng menu khi bấm ra ngoài.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onClick);

    return () => {
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  // Lấy thông tin tài khoản từ AuthContext.
  const adminName = user?.name?.trim() || user?.email || 'Admin';
  const adminEmail = user?.email || '';
  const avatarLetter = adminName.charAt(0).toUpperCase() || 'A';

  // Đăng xuất thông qua AuthContext để đồng bộ toàn ứng dụng.
  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setMenuOpen(false);

    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
      setIsLoggingOut(false);
    }
  };

  return (
    <header
      className={cn(
        'min-h-header border-b border-border-default bg-bg-app',
        'flex items-center justify-between px-4 py-3 lg:px-8 gap-4',
      )}
    >
      {/* Tiêu đề trang */}
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold text-text-primary">
          {title}
        </h1>

        {subtitle && (
          <p className="mt-0.5 truncate text-xs text-text-muted">
            {subtitle}
          </p>
        )}
      </div>

      {/* Các thao tác bên phải */}
      <div className="flex shrink-0 items-center gap-3">
        {/* Tìm kiếm */}
        <div className="relative hidden md:block">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />

          <input
            type="search"
            placeholder="Search..."
            aria-label="Tìm kiếm"
            className={cn(
              'h-10 w-64 rounded-btn pl-10 pr-4',
              'border border-border-strong bg-bg-elevated',
              'text-sm text-text-primary placeholder:text-text-muted',
              'focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary',
              'transition-all duration-app',
            )}
          />
        </div>

        {/* Thông báo */}
        <button
          type="button"
          aria-label="Thông báo"
          className={cn(
            'relative inline-flex h-10 w-10 items-center justify-center rounded-btn',
            'bg-transparent text-text-secondary',
            'transition-all duration-app hover:bg-bg-hover hover:text-text-primary',
            'active:translate-y-px',
          )}
        >
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent-primary" />
        </button>

        {/* Tạo mới */}
        <Button
          type="button"
          onClick={() => {
            // Gắn hành động tạo mới theo từng trang khi cần.
          }}
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Create</span>
        </Button>

        {/* Đang khôi phục phiên: không hiển thị nhầm nút đăng nhập */}
        {isLoading ? (
          <div
            className="flex h-10 w-10 items-center justify-center"
            aria-label="Đang kiểm tra phiên đăng nhập"
          >
            <Loader2
              size={18}
              className="animate-spin text-text-muted"
            />
          </div>
        ) : !isAuthenticated ? (
          /* Chưa đăng nhập */
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/login')}
          >
            <LogIn size={16} />
            <span className="hidden sm:inline">Đăng nhập</span>
          </Button>
        ) : (
          /* Đã đăng nhập: hiển thị menu tài khoản */
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              aria-label="Menu tài khoản Admin"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className={cn(
                'flex h-10 items-center gap-2 rounded-full',
                'border border-border-strong bg-bg-elevated px-1.5 pr-3',
                'text-text-primary transition-all duration-app',
                'hover:border-text-muted',
                'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-app',
              )}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-primary text-sm font-semibold text-black">
                {avatarLetter}
              </span>

              <span className="hidden max-w-28 truncate text-sm font-medium sm:block">
                {adminName}
              </span>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className={cn(
                  'absolute right-0 top-12 z-50 w-60 rounded-btn py-1.5',
                  'border border-border-default bg-bg-elevated shadow-xl',
                )}
              >
                {/* Thông tin Admin */}
                <div className="border-b border-border-default px-3 py-3">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {adminName}
                  </p>

                  <p className="mt-1 truncate text-xs text-text-muted">
                    {adminEmail}
                  </p>

                  <p className="mt-1 text-xs text-text-muted">
                    Quản trị viên
                  </p>
                </div>

                {/* Hồ sơ cá nhân */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/profile');
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2.5 text-sm',
                    'text-text-secondary transition-colors',
                    'hover:bg-bg-hover hover:text-text-primary',
                  )}
                >
                  <UserIcon size={16} />
                  Hồ sơ cá nhân
                </button>

                {/* Đăng xuất */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2.5 text-sm',
                    'text-status-danger transition-colors',
                    'hover:bg-status-danger/10',
                    'disabled:cursor-not-allowed disabled:opacity-60',
                  )}
                >
                  {isLoggingOut ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <LogOut size={16} />
                  )}

                  {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
