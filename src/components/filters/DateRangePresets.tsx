import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { DateRangePreset } from '@/services/reportService'

const PRESETS: Array<{ value: DateRangePreset; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'custom', label: 'Custom' },
]

export function DateRangePresets({
  preset,
  fromDate,
  toDate,
  onChange,
}: {
  preset: DateRangePreset
  fromDate: string
  toDate: string
  onChange: (next: { preset: DateRangePreset; fromDate: string; toDate: string }) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant={preset === item.value ? 'primary' : 'secondary'}
            onClick={() => onChange({ preset: item.value, fromDate, toDate })}
          >
            {item.label}
          </Button>
        ))}
      </div>
      {preset === 'custom' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="From"
            type="date"
            value={fromDate}
            onChange={(e) => onChange({ preset: 'custom', fromDate: e.target.value, toDate })}
          />
          <Input
            label="To"
            type="date"
            value={toDate}
            onChange={(e) => onChange({ preset: 'custom', fromDate, toDate: e.target.value })}
          />
        </div>
      ) : null}
    </div>
  )
}
