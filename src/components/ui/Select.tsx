import type { SelectHTMLAttributes } from 'react'
import { fieldControlClass, fieldErrorClass, fieldLabelClass } from '@/components/ui/fieldStyles'

type Option = { value: string; label: string }

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  options: Option[]
  error?: string
  placeholder?: string
}

export function Select({
  label,
  options,
  error,
  placeholder,
  id,
  className = '',
  required,
  ...props
}: SelectProps) {
  const selectId = id ?? props.name
  return (
    <label className="block text-sm" htmlFor={selectId}>
      <span className={fieldLabelClass}>
        {label}
        {required ? (
          <span className="ml-0.5 text-rose-600" aria-hidden="true">
            *
          </span>
        ) : null}
      </span>
      <select
        id={selectId}
        required={required}
        className={fieldControlClass(Boolean(error), `appearance-none bg-[length:1rem] pr-9 ${className}`)}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className={fieldErrorClass}>{error}</span> : null}
    </label>
  )
}
