import styles from "./FeatureBar.module.css";

const items = [
  {
    title: "Chất lượng cao",
    text: "Vật liệu chọn lọc",
    icon: "M8 4h8l2 4v3a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V8zm2 12h4",
  },
  {
    title: "Bảo hành",
    text: "Trên 2 năm",
    icon: "M12 3l7 3v6c0 4.2-2.8 7.4-7 9-4.2-1.6-7-4.8-7-9V6z",
  },
  {
    title: "Miễn phí vận chuyển",
    text: "Đơn từ 3.000.000₫",
    icon: "M3 7h11v8H3zm11 2h4l2 3v3h-6zM7 18a2 2 0 1 0 0.01 0M17 18a2 2 0 1 0 0.01 0",
  },
  {
    title: "Hỗ trợ 24/7",
    text: "Tư vấn sản phẩm",
    icon: "M4 13a8 8 0 0 1 16 0v5a2 2 0 0 1-2 2h-2v-7h4M4 13v5a2 2 0 0 0 2 2h2v-7H4",
  },
];

export function FeatureBar() {
  return (
    <section className={styles.bar}>
      <div className={`wrap ${styles.list}`}>
        {items.map((item) => (
          <div key={item.title} className={styles.item}>
            <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="#242424" strokeWidth="1.4">
              <path d={item.icon} />
            </svg>
            <div>
              <p className={styles.title}>{item.title}</p>
              <p className={styles.text}>{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
