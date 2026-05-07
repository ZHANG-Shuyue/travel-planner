import type { SchengenCity } from '../types/city'

interface BudgetReferenceProps {
  budgetPerDay: SchengenCity['budgetPerDay']
  days?: number
}

export default function BudgetReference({ budgetPerDay, days }: BudgetReferenceProps) {
  const minTotal = days ? budgetPerDay.budget * days : null
  const maxTotal = days ? budgetPerDay.luxury * days : null

  return (
    <div className="rounded-xl border border-muted/60 bg-white p-3 text-sm dark:bg-dark-card">
      <p className="mb-2 font-medium text-slate-700 dark:text-slate-100">日均花费参考</p>
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-secondary" />穷游
          </span>
          <span>€{budgetPerDay.budget}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary" />舒适
          </span>
          <span>€{budgetPerDay.mid}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-purple" />奢华
          </span>
          <span>€{budgetPerDay.luxury}</span>
        </div>
      </div>

      {days && minTotal !== null && maxTotal !== null && (
        <p className="mt-2 rounded-lg bg-warm/45 px-2 py-1 text-xs text-slate-700 dark:bg-slate-700/40 dark:text-slate-100">
          {days}天预估总花费：€{minTotal} - €{maxTotal}
        </p>
      )}
    </div>
  )
}
