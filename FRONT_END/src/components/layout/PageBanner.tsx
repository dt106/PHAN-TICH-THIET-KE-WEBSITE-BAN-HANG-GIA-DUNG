import { Link } from "react-router-dom";
import logo from "../../assets/images/logo.png";
import styles from "./PageBanner.module.css";

export function PageBanner({
  title,
  current,
}: {
  title: string;
  current?: string;
}) {
  return (
    <section className={styles.banner}>
      <div>
        <img src={logo} alt="" width={77} height={77} style={{ width: 48, height: 48, objectFit: "cover", objectPosition: "center" }} />
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.crumbs}>
          <Link to="/">Trang chủ</Link>
          <span aria-hidden="true">&gt;</span>
          <span className={styles.current}>{current ?? title}</span>
        </p>
      </div>
    </section>
  );
}
