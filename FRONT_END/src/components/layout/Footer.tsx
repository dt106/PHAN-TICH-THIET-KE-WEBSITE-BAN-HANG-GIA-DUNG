import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { showToast } from "../common/Toast/showToast.tsx";
import styles from "./Footer.module.css";
import "../common/tokens.css";

export function Footer() {
  const [email, setEmail] = useState("");

  function subscribe(event: FormEvent) {
    event.preventDefault();
    if (!email.includes("@")) {
      showToast("Nhập email hợp lệ.", "error");
      return;
    }
    showToast("Cửa hàng chưa có API đăng ký bản tin.", "warning");
    setEmail("");
  }

  return (
    <footer className={styles.footer}>
      <div className="wrap">
        <div className={styles.grid}>
          <div>
            <p className={styles.brand}>Funiro.</p>
            <p className={styles.address}>
              400 University Drive Suite 200 Coral Gables,
              <br />
              FL 33134 USA
            </p>
          </div>
          <div>
            <p className={styles.heading}>Liên kết</p>
            <div className={styles.links}>
              <Link to="/">Trang chủ</Link>
              <Link to="/shop">Cửa hàng</Link>
              <Link to="/about">Giới thiệu</Link>
              <Link to="/contact">Liên hệ</Link>
            </div>
          </div>
          <div>
            <p className={styles.heading}>Hỗ trợ</p>
            <div className={styles.links}>
              <Link to="/checkout">Thanh toán</Link>
              <Link to="/orders">Đơn hàng</Link>
              <Link to="/account">Tài khoản</Link>
            </div>
          </div>
          <div>
            <p className={styles.heading}>Bản tin</p>
            <form className={styles.newsletter} onSubmit={subscribe}>
              <input
                type="email"
                required
                placeholder="Email của bạn"
                aria-label="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <button type="submit">GỬI</button>
            </form>
          </div>
        </div>
        <p className={styles.legal}>2023 furino. All rights reverved</p>
      </div>
    </footer>
  );
}
