export function fieldControlClass(error?: boolean, extra = '') {
  return [
    'w-full min-h-10 rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(15,23,42,0.02)]',
    'placeholder:text-slate-400',
    'transition-[border-color,box-shadow,background-color] duration-150',
    'outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/8',
    'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500',
    error
      ? 'border-rose-400 focus:border-rose-600 focus:ring-rose-600/10'
      : 'border-slate-200 hover:border-slate-300',
    extra,
  ]
    .filter(Boolean)
    .join(' ')
}

export const fieldLabelClass = 'mb-1.5 block text-sm font-medium text-slate-700'
export const fieldHintClass = 'mt-1.5 block text-xs leading-5 text-slate-500'
export const fieldErrorClass = 'mt-1.5 block text-xs leading-5 text-rose-700'
