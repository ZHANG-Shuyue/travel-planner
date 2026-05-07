import citiesData from '../data/schengen-cities.json'
import type { TravelPlan } from '../types/plan'
import type { SchengenCity } from '../types/city'

interface PlanComparisonProps {
  plans: TravelPlan[]
  onSelectPlan?: (planId: string) => void
}

const cityMap = new Map((citiesData as SchengenCity[]).map((city) => [city.id, city]))

function getPlanCountries(plan: TravelPlan) {
  const countries = new Map<string, string>()
  plan.cities.forEach((cityId) => {
    const city = cityMap.get(cityId)
    if (city) countries.set(city.country, city.flag)
  })
  return [...countries.entries()]
}

export default function PlanComparison({ plans, onSelectPlan }: PlanComparisonProps) {
  const picked = plans.slice(0, 3)
  if (picked.length < 2) {
    return <div className="rounded-xl bg-white p-4 text-sm">请选择至少 2 个方案进行对比。</div>
  }

  const budgets = picked.map((plan) => plan.totalBudget.total)
  const maxBudget = Math.max(...budgets)
  const minBudget = Math.min(...budgets)

  return (
    <div className="overflow-x-auto rounded-2xl border border-muted/60 bg-white p-4 dark:bg-dark-card">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-muted/50 text-left">
            <th className="p-2">维度</th>
            {picked.map((plan) => (
              <th key={plan.id} className="p-2 font-medium">
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-muted/30">
            <td className="p-2 text-slate-500">天数</td>
            {picked.map((plan) => (
              <td key={`${plan.id}-days`} className="p-2">
                {plan.totalDays} 天
              </td>
            ))}
          </tr>

          <tr className="border-b border-muted/30">
            <td className="p-2 text-slate-500">途经国家</td>
            {picked.map((plan) => (
              <td key={`${plan.id}-countries`} className="p-2">
                <div className="flex flex-wrap gap-1">
                  {getPlanCountries(plan).map(([country, flag]) => (
                    <span key={country} className="rounded bg-background px-2 py-0.5 text-xs">
                      {flag} {country}
                    </span>
                  ))}
                </div>
              </td>
            ))}
          </tr>

          <tr className="border-b border-muted/30">
            <td className="p-2 text-slate-500">城市列表</td>
            {picked.map((plan) => (
              <td key={`${plan.id}-cities`} className="p-2">
                {plan.cities
                  .map((cityId) => cityMap.get(cityId)?.nameZh ?? cityId)
                  .join(' · ')}
              </td>
            ))}
          </tr>

          <tr className="border-b border-muted/30">
            <td className="p-2 text-slate-500">预估总预算</td>
            {picked.map((plan) => {
              const budget = plan.totalBudget.total
              const isHigh = budget === maxBudget && maxBudget - minBudget > 250
              const isLow = budget === minBudget && maxBudget - minBudget > 250

              return (
                <td
                  key={`${plan.id}-budget`}
                  className={`p-2 ${isHigh ? 'bg-red-50 text-red-700' : ''} ${isLow ? 'bg-emerald-50 text-emerald-700' : ''}`}
                >
                  €{budget}
                </td>
              )
            })}
          </tr>

          <tr className="border-b border-muted/30">
            <td className="p-2 text-slate-500">风格标签</td>
            {picked.map((plan) => (
              <td key={`${plan.id}-style`} className="p-2">
                <span className="rounded-full bg-primary/20 px-3 py-1 text-xs text-primary">
                  {plan.totalBudget.level === 'budget'
                    ? '性价比路线'
                    : plan.totalBudget.level === 'mid'
                      ? '舒适平衡'
                      : '品质深度游'}
                </span>
              </td>
            ))}
          </tr>

          <tr>
            <td className="p-2 text-slate-500">操作</td>
            {picked.map((plan) => (
              <td key={`${plan.id}-action`} className="p-2">
                <button
                  className="rounded-full bg-purple px-4 py-1.5 text-xs text-white"
                  onClick={() => onSelectPlan?.(plan.id)}
                >
                  选择此方案
                </button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
