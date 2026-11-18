import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { footerColumns, site } from "../../constants/site.ts";
import { showToast } from "../common/Toast/showToast.tsx";
import styles from "./Footer.module.css";

export function Footer() {
  const [email, setEmail] = useState("");

  function subscribe(event: FormEvent) {
    event.preventDefault();
    if (!email.includes("@")) {
      showToast("Nhập email hợp lệ.", "error");
      return;
    }
    showToast("Bạn đã đăng ký nhận tin.", "success");
    setEmail("");
  }

  return (
    <footer className={styles.footer}>
      <div className="wrap">
        <div className={styles.grid}>
          <div>
            <p className={styles.brand}>{site.name}</p>
            <p className={styles.address}>
              {site.address[0]}
              <br />
              {site.address[1]}
            </p>
          </div>
          {footerColumns.map((column) => (
            <div key={column.title}>
              <p className={styles.heading}>{column.title}</p>
              <div className={styles.links}>
                {column.links.map((link) => (
                  <Link key={link.label} to={link.to}>{link.label}</Link>
                ))}
              </div>
            </div>
          ))}
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
              <button type="submit">Đăng ký</button>
            </form>
          </div>
        </div>
        <p className={styles.legal}>© {new Date().getFullYear()} {site.name}</p>
      </div>
    </footer>
  );
}
