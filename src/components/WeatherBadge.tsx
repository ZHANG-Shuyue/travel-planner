import type { SchengenCity } from '../types/city'

interface WeatherBadgeProps {
  weather: SchengenCity['weather']
  bestMonths: number[]
  currentMonth: number
}

const MONTH_TO_SEASON: Record<number, keyof SchengenCity['weather']> = {
  12: 'winter',
  1: 'winter',
  2: 'winter',
  3: 'spring',
  4: 'spring',
  5: 'spring',
  6: 'summer',
  7: 'summer',
  8: 'summer',
  9: 'autumn',
  10: 'autumn',
  11: 'autumn',
}

function iconByWeather(temp: number, rainfall: string) {
  if (temp <= 2) return '❄️'
  if (rainfall.includes('高') || rainfall.includes('雨')) return '🌧️'
  if (temp >= 24) return '☀️'
  return '🌤️'
}

export default function WeatherBadge({ weather, bestMonths, currentMonth }: WeatherBadgeProps) {
  const season = MONTH_TO_SEASON[currentMonth] ?? 'spring'
  const current = weather[season]
  const isBestSeason = bestMonths.includes(currentMonth)

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-muted/60 bg-warm/60 px-3 py-1 text-xs text-slate-700 dark:bg-dark-card dark:text-slate-200">
      <span>{iconByWeather(current.avgTemp, current.rainfall)}</span>
      <span>{current.avgTemp}°C</span>
      <span className="truncate">{current.description}</span>
      {isBestSeason && (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">
          ✓ 当季推荐
        </span>
      )}
    </div>
  )
}
