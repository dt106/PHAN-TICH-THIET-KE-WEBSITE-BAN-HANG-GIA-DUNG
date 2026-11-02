import styles from "./Quantity.module.css";

export function Quantity({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className={styles.stepper}>
      <button type="button" aria-label="Giảm số lượng" onClick={() => onChange(value - 1)}>
        -
      </button>
      <input
        aria-label="Số lượng"
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 1)}
      />
      <button type="button" aria-label="Tăng số lượng" onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}
