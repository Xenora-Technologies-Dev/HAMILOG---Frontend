import type { ReactNode } from 'react'

type Column<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
  className?: string
}

export function Table<T extends { id: string }>({
  columns,
  rows,
  empty,
}: {
  columns: Column<T>[]
  rows: T[]
  empty?: ReactNode
}) {
  if (rows.length === 0) {
    return <>{empty}</>
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50/80">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase ${column.className ?? ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr key={row.id} className="transition-colors hover:bg-slate-50/90">
              {columns.map((column) => (
                <td key={column.key} className={`px-4 py-3.5 text-slate-800 ${column.className ?? ''}`}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
