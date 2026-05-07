import { useMemo, useState } from 'react'
import type { SchengenCity } from '../types/city'
import type { AlternativeCityCandidate } from '../hooks/useSmartRecommend'

interface InsertCityPanelProps {
  candidates: AlternativeCityCandidate[]
  allCities: SchengenCity[]
  existingCityIds: string[]
  onInsert: (cityId: string, days: number, mode: 'increase' | 'redistribute') => void
  onClose: () => void
}

export default function InsertCityPanel({ candidates, allCities, existingCityIds, onInsert, onClose }: InsertCityPanelProps) {
  const [query, setQuery] = useState('')
  const [selectedCityId, setSelectedCityId] = useState<string>('')
  const [days, setDays] = useState(1)
  const [mode, setMode] = useState<'increase' | 'redistribute'>('increase')

  const manualOptions = useMemo(() => {
    const k = query.trim().toLowerCase()
    return allCities
      .filter((city) => !existingCityIds.includes(city.id))
      .filter((city) => !k || city.name.toLowerCase().includes(k) || city.nameZh.toLowerCase().includes(k))
      .slice(0, 8)
  }, [allCities, existingCityIds, query])

  return (
    <div className="rounded-xl border border-secondary/40 bg-secondary/10 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">插入一站</p>
        <button className="text-xs text-slate-500" onClick={onClose}>关闭</button>
      </div>

      <div className="mt-2 space-y-2">
        <p className="text-xs text-slate-500">推荐中转城市</p>
        {candidates.slice(0, 8).map((item) => (
          <button
            key={item.city.id}
            className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${selectedCityId === item.city.id ? 'border-primary bg-primary/10' : 'border-muted/50 bg-white dark:bg-dark-card'}`}
            onClick={() => {
              setSelectedCityId(item.city.id)
              setDays(Math.max(1, Math.round(item.city.avgDaysRecommended || 1)))
            }}
          >
            <p className="text-sm font-medium">{item.city.flag} {item.city.nameZh}</p>
            <p className="mt-1 text-slate-500">{item.reason}</p>
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-lg border border-muted/50 bg-white p-2 text-xs dark:bg-dark-card">
        <p className="mb-1">或手动搜索任意城市</p>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full rounded border border-muted/60 px-2 py-1"
          placeholder="搜索城市"
        />
        {query ? (
          <div className="mt-1 max-h-32 overflow-auto space-y-1">
            {manualOptions.map((city) => (
              <button key={city.id} className="block w-full rounded px-2 py-1 text-left hover:bg-muted/40" onClick={() => setSelectedCityId(city.id)}>
                {city.flag} {city.nameZh}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="rounded-lg border border-muted/50 bg-white p-2 text-xs dark:bg-dark-card">
          分配几天
          <input type="range" min={1} max={5} value={days} onChange={(event) => setDays(Number(event.target.value))} className="mt-1 w-full" />
          <p>{days} 天</p>
        </label>
        <label className="rounded-lg border border-muted/50 bg-white p-2 text-xs dark:bg-dark-card">
          天数来源
          <select value={mode} onChange={(event) => setMode(event.target.value as 'increase' | 'redistribute')} className="mt-1 w-full rounded border border-muted/60 px-2 py-1">
            <option value="increase">总天数增加</option>
            <option value="redistribute">从相邻城市分一天</option>
          </select>
        </label>
      </div>

      <button
        className="mt-3 rounded-full bg-primary px-4 py-1.5 text-xs text-white disabled:opacity-50"
        disabled={!selectedCityId}
        onClick={() => onInsert(selectedCityId, days, mode)}
      >
        确认插入
      </button>
    </div>
  )
}
