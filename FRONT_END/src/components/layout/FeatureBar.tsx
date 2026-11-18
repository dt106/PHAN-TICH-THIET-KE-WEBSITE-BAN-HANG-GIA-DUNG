import { features } from "../../constants/site.ts";
import styles from "./FeatureBar.module.css";

export function FeatureBar() {
  return (
    <section className={styles.bar}>
      <div className={`wrap ${styles.list}`}>
        {features.map((item) => (
          <div key={item.title} className={styles.item}>
            <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
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
