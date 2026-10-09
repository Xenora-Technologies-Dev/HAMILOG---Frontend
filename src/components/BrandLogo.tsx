import { APP_LOGO_SRC, APP_NAME } from '@/lib/config'

type BrandLogoProps = {
  /** Visual size preset */
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** Show text name beside/under the mark */
  showName?: boolean
  nameClassName?: string
}

const sizeClass = {
  sm: 'h-8 w-auto',
  md: 'h-12 w-auto',
  lg: 'h-16 w-auto max-w-[240px]',
} as const

export function BrandLogo({
  size = 'md',
  className = '',
  showName = false,
  nameClassName = '',
}: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <img
        src={APP_LOGO_SRC}
        alt={APP_NAME}
        className={`${sizeClass[size]} object-contain`}
        decoding="async"
      />
      {showName ? (
        <span className={`font-semibold tracking-wide text-slate-900 ${nameClassName}`.trim()}>
          {APP_NAME}
        </span>
      ) : null}
    </div>
  )
}
