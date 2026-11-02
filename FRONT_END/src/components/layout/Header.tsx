import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import accountIcon from "../../assets/icons/account.svg";
import cartIcon from "../../assets/icons/cart.svg";
import heartIcon from "../../assets/icons/heart.svg";
import searchIcon from "../../assets/icons/search.svg";
import logo from "../../assets/images/logo.png";
import { useCart } from "../../contexts/useCart.ts";
import styles from "./Header.module.css";

const links = [
  { to: "/", label: "Trang chủ", end: true },
  { to: "/shop", label: "Cửa hàng" },
  { to: "/about", label: "Giới thiệu" },
  { to: "/contact", label: "Liên hệ" },
];

export function Header({ onOpenCart }: { onOpenCart: () => void }) {
  const { count } = useCart();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <span className={styles.mark}>
            <img src={logo} alt="" />
          </span>
          <p className={styles.name}>Furniro</p>
        </Link>
        <nav className={styles.nav} aria-label="Chính">
          {links.map((link) => (
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
                placeholder="Tìm sản phẩm"
                autoFocus
              />
            </form>
          ) : (
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Tìm kiếm"
              onClick={() => setSearchOpen(true)}
            >
              <img src={searchIcon} alt="" />
            </button>
          )}
          <Link to="/wishlist" className={styles.iconButton} aria-label="Danh sách yêu thích">
            <img src={heartIcon} alt="" />
          </Link>
          <button type="button" className={styles.iconButton} aria-label="Giỏ hàng" onClick={onOpenCart}>
            <img src={cartIcon} alt="" />
            {count > 0 ? <span className={styles.badge}>{count}</span> : null}
          </button>
        </div>
      </div>
    </header>
  );
}
