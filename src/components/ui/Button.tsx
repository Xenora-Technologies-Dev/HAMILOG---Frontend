import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { Spinner } from '@/components/ui/Spinner'

const variants = {
  primary:
    'bg-slate-900 text-white shadow-sm hover:bg-slate-800 active:bg-slate-950 disabled:hover:bg-slate-900',
  secondary:
    'bg-white text-slate-800 border border-slate-200 shadow-sm hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-800',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200/80',
} as const

const sizes = {
  sm: 'min-h-8 px-2.5 text-xs',
  md: 'min-h-10 px-4 text-sm',
  lg: 'min-h-11 px-5 text-sm',
} as const

export type ButtonVariant = keyof typeof variants
export type ButtonSize = keyof typeof sizes

function buttonClassName({
  variant = 'primary',
  size = 'md',
  className = '',
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
} = {}) {
  return [
    'inline-flex items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap',
    'transition-[background-color,border-color,box-shadow,transform,opacity] duration-150',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'active:translate-y-px',
    variants[variant],
    sizes[size],
    className,
  ].join(' ')
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
  busy?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  busy,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, className })}
      disabled={disabled || busy}
      {...props}
    >
      {busy ? (
        <Spinner
          className={
            variant === 'primary' || variant === 'danger'
              ? 'h-4 w-4 border-white/30 border-t-white'
              : 'h-4 w-4'
          }
        />
      ) : null}
      {children}
    </button>
  )
}

type ButtonLinkProps = Omit<LinkProps, 'className'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  children: ReactNode
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClassName({ variant, size, className })} {...props}>
      {children}
    </Link>
  )
}
