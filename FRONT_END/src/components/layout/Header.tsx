import { useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useNavigate } from "react-router-dom";
import accountIcon from "../../assets/icons/account.svg";
import cartIcon from "../../assets/icons/cart.svg";
import heartIcon from "../../assets/icons/heart.svg";
import searchIcon from "../../assets/icons/search.svg";
import logo from "../../assets/images/logo.png";
import { navLinks, site } from "../../constants/site.ts";
import { useCart } from "../../contexts/useCart.ts";
import styles from "./Header.module.css";

export function Header({ onOpenCart }: { onOpenCart: () => void }) {
  const { count } = useCart();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <button type="button" className={styles.menuButton} aria-label="Mở menu" onClick={() => setMenuOpen(true)}>
          ☰
        </button>
        <Link to="/" className={styles.brand}>
          <span className={styles.mark}>
            <img src={logo} alt="" />
          </span>
          <p className={styles.name}>{site.name}</p>
        </Link>
        <nav className={styles.nav} aria-label="Chính">
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.tools}>
          <Link to="/account" className={styles.iconButton} aria-label="Tài khoản">
            <img src={accountIcon} alt="" />
          </Link>
          {searchOpen ? (
            <form
              className={styles.search}
              onSubmit={(event) => {
                event.preventDefault();
                navigate(query ? `/shop?q=${encodeURIComponent(query)}` : "/shop");
                setSearchOpen(false);
              }}
            >
              <input
                aria-label="Tìm sản phẩm"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm kiếm"
                autoFocus
              />
            </form>
          ) : (
            <button type="button" className={styles.iconButton} aria-label="Tìm kiếm" onClick={() => setSearchOpen(true)}>
              <img src={searchIcon} alt="" />
            </button>
          )}
          <Link to="/wishlist" className={styles.iconButton} aria-label="Yêu thích">
            <img src={heartIcon} alt="" />
          </Link>
          <button type="button" className={styles.iconButton} aria-label="Giỏ hàng" onClick={onOpenCart}>
            <img src={cartIcon} alt="" />
            {count > 0 ? <span className={styles.badge}>{count}</span> : null}
          </button>
        </div>
      </div>
      {menuOpen
        ? createPortal(
            <div className={styles.drawer}>
              <button type="button" className={styles.backdrop} aria-label="Đóng menu" onClick={() => setMenuOpen(false)} />
              <nav className={styles.panel} aria-label="Menu">
                <button type="button" className={styles.close} aria-label="Đóng" onClick={() => setMenuOpen(false)}>×</button>
                {navLinks.map((link) => (
                  <NavLink key={link.to} to={link.to} end={link.end} onClick={() => setMenuOpen(false)}>
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            </div>,
            document.body,
          )
        : null}
    </header>
  );
}
