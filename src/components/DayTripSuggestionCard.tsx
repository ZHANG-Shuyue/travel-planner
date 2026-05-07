import { useMemo, useState } from 'react'
import type { DayTrip, SchengenCity } from '../types/city'

interface DayTripSuggestionCardProps {
  city: SchengenCity
  maxItems?: number
}

function TripItem({ trip }: { trip: DayTrip }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-muted/50 bg-white/70 p-2 dark:bg-dark-card/70">
      <button className="flex w-full items-start justify-between gap-2 text-left" onClick={() => setOpen((v) => !v)}>
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-100">{trip.name}</p>
          <p className="text-xs text-slate-500">{trip.distance} · {trip.duration}</p>
        </div>
        <span className="text-xs text-purple">{open ? '▲' : '▼'}</span>
      </button>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{trip.highlights}</p>
      {open ? (
        <div className="mt-2 rounded-md bg-background/80 p-2 text-xs text-slate-600 dark:bg-dark-bg dark:text-slate-200">
          <p>交通：{trip.transport}</p>
          <p className="mt-1">建议停留：{trip.recommendedHours} 小时</p>
          <p className="mt-1">适合：{trip.bestFor.join(' / ')}</p>
        </div>
      ) : null}
    </div>
  )
}

export default function DayTripSuggestionCard({ city, maxItems = 3 }: DayTripSuggestionCardProps) {
  const items = useMemo(() => city.dayTrips.slice(0, maxItems), [city.dayTrips, maxItems])
  if (!items.length) return null

  return (
    <article className="rounded-2xl border border-dashed border-[#b7c9b2] bg-[#f3f8f1] p-4 dark:border-[#6f8a68] dark:bg-[#1f2a1f]">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-100">📍 周边一日游可选</h4>
      <p className="mt-1 text-xs text-slate-500">可选行程，自由替换某一天的安排</p>
      <div className="mt-3 space-y-2">
        {items.map((trip) => (
          <TripItem key={`${city.id}-${trip.name}`} trip={trip} />
        ))}
      </div>
    </article>
  )
}
