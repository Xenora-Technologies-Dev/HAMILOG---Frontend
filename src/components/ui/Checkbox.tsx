import type { InputHTMLAttributes } from 'react'

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
}

export function Checkbox({ label, className = '', id, ...props }: CheckboxProps) {
  const inputId = id ?? props.name
  return (
    <label htmlFor={inputId} className={`inline-flex cursor-pointer items-start gap-2.5 text-sm text-slate-700 ${className}`}>
      <input
        id={inputId}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded-md border-slate-300 text-slate-900 accent-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 disabled:cursor-not-allowed"
        {...props}
      />
      <span>{label}</span>
    </label>
  )
}

export function ChoiceChip({
  label,
  selected,
  onToggle,
  accent = false,
}: {
  label: string
  selected: boolean
  onToggle: () => void
  accent?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={[
        'inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-medium transition',
        selected && accent
          ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm'
          : selected
            ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
            : accent
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
      ].join(' ')}
    >
      {label}
    </button>
  )
}
