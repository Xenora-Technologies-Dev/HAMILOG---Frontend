import type { InputHTMLAttributes } from 'react'
import { fieldControlClass, fieldErrorClass, fieldHintClass, fieldLabelClass } from '@/components/ui/fieldStyles'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, id, className = '', required, ...props }: InputProps) {
  const inputId = id ?? props.name
  return (
    <label className="block text-sm" htmlFor={inputId}>
      <span className={fieldLabelClass}>
        {label}
        {required ? (
          <span className="ml-0.5 text-rose-600" aria-hidden="true">
            *
          </span>
        ) : null}
      </span>
      <input
        id={inputId}
        required={required}
        className={fieldControlClass(Boolean(error), className)}
        {...props}
      />
      {hint && !error ? <span className={fieldHintClass}>{hint}</span> : null}
      {error ? <span className={fieldErrorClass}>{error}</span> : null}
    </label>
  )
}
