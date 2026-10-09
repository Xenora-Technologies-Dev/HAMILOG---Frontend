import type { TextareaHTMLAttributes } from 'react'
import { fieldControlClass, fieldErrorClass, fieldHintClass, fieldLabelClass } from '@/components/ui/fieldStyles'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  error?: string
  hint?: string
}

export function Textarea({
  label,
  error,
  hint,
  id,
  className = '',
  required,
  rows = 4,
  ...props
}: TextareaProps) {
  const textareaId = id ?? props.name
  const control = (
    <textarea
      id={textareaId}
      required={required}
      rows={rows}
      className={fieldControlClass(Boolean(error), `min-h-24 resize-y leading-6 ${className}`)}
      {...props}
    />
  )

  if (!label) {
    return (
      <div>
        {control}
        {hint && !error ? <span className={fieldHintClass}>{hint}</span> : null}
        {error ? <span className={fieldErrorClass}>{error}</span> : null}
      </div>
    )
  }

  return (
    <label className="block text-sm" htmlFor={textareaId}>
      <span className={fieldLabelClass}>
        {label}
        {required ? (
          <span className="ml-0.5 text-rose-600" aria-hidden="true">
            *
          </span>
        ) : null}
      </span>
      {control}
      {hint && !error ? <span className={fieldHintClass}>{hint}</span> : null}
      {error ? <span className={fieldErrorClass}>{error}</span> : null}
    </label>
  )
}
