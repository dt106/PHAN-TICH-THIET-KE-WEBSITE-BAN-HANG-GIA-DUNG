import { useId, useState, type InputHTMLAttributes, type ReactNode, type Ref } from 'react'
import { cn } from '../cn.ts'
import styles from './TextInput.module.css'

export type TextInputSize = 'sm' | 'md' | 'lg'

export type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  ref?: Ref<HTMLInputElement>
  label?: ReactNode
  hint?: ReactNode
  error?: string
  size?: TextInputSize
  fullWidth?: boolean
  leftAddon?: ReactNode
  rightAddon?: ReactNode
}

export function TextInput({
  ref,
  id,
  label,
  hint,
  error,
  size = 'md',
  fullWidth = false,
  leftAddon,
  rightAddon,
  className,
  disabled,
  required,
  type = 'text',
  ...rest
}: TextInputProps) {
  const generatedId = useId()
  const [showPassword, setShowPassword] = useState(false)
  const inputId = id ?? generatedId
  const inputType = type === 'password' && showPassword ? 'text' : type
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [error ? errorId : hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn(styles.field, fullWidth && styles.fullWidth, className)}>
      {label ? (
        <label className={styles.label} htmlFor={inputId}>
          {label}
          {required ? (
            <span className={styles.required} aria-hidden="true">
              {' '}
              *
            </span>
          ) : null}
        </label>
      ) : null}
      <div
        className={cn(
          styles.control,
          styles[size],
          error && styles.invalid,
          disabled && styles.disabled,
        )}
      >
        {leftAddon ? <span className={styles.addon}>{leftAddon}</span> : null}
        <input
          {...rest}
          ref={ref}
          id={inputId}
          type={inputType}
          className={styles.input}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        {type === 'password' ? (
          <button
            type="button"
            className={styles.reveal}
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? 'Ẩn' : 'Hiện'}
          </button>
        ) : null}
        {rightAddon ? <span className={styles.addon}>{rightAddon}</span> : null}
      </div>
      {error ? (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}
