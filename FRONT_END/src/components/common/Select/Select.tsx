import { useId, type ReactNode } from "react";
import { cn } from "../cn.ts";
import styles from "../TextInput/TextInput.module.css";

export function Select({
  label,
  value,
  options,
  onChange,
  fullWidth = false,
}: {
  label?: ReactNode;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  fullWidth?: boolean;
}) {
  const id = useId();
  return (
    <div className={cn(styles.field, fullWidth && styles.fullWidth)}>
      {label ? (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      ) : null}
      <div className={cn(styles.control, styles.md)}>
        <select id={id} className={styles.select} value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
