import type { ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "../cn.ts";
import styles from "./Button.module.css";
import type { ButtonSize, ButtonVariant } from "./Button.tsx";

type Props = LinkProps & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
};

export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  children,
  ...rest
}: Props) {
  return (
    <Link
      {...rest}
      className={cn(styles.button, styles[variant], styles[size], fullWidth && styles.fullWidth, className)}
    >
      {children}
    </Link>
  );
}
