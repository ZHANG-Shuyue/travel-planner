import { useMemo, useState } from 'react'
import type { LocalTransport, SchengenCity, StayArea } from '../types/city'
import type { DayPlan, TravelStyle } from '../types/plan'
import WeatherBadge from './WeatherBadge'
import BudgetReference from './BudgetReference'

interface TransitBadge {
  icon: string
  text: string
  morningText?: string
}

interface DayCardProps {
  dayPlan: DayPlan
  city: SchengenCity
  dateLabel?: string
  editable?: boolean
  onChange?: (next: DayPlan) => void
  onDelete?: (dayNumber: number) => void
  onRegenerate?: (dayNumber: number) => void
  transitBadge?: TransitBadge
  travelStyle?: TravelStyle
  stayRecommendation?: StayArea
  stayAreas?: StayArea[]
  arrivalTransportTip?: LocalTransport
}

export default function DayCard({
  dayPlan,
  city,
  dateLabel,
  editable = false,
  onChange,
  onDelete,
  onRegenerate,
  transitBadge,
  travelStyle = 'balanced',
  stayRecommendation,
  stayAreas,
  arrivalTransportTip,
}: DayCardProps) {
  const [expanded, setExpanded] = useState(true)
  const [showStayDetails, setShowStayDetails] = useState(false)
  const [showTransportDetails, setShowTransportDetails] = useState(false)
  const currentMonth = useMemo(() => new Date().getMonth() + 1, [])

  const compact = travelStyle === 'speedrun'
  const relaxed = travelStyle === 'relaxed'

  const updateField = (key: keyof DayPlan, value: string) => {
    if (!onChange) return
    onChange({ ...dayPlan, [key]: value })
  }

  const renderField = (label: string, key: keyof DayPlan, override?: string) => {
    const value = override ?? String(dayPlan[key] ?? '')
    return (
      <div className={`rounded-lg bg-background/70 p-2 ${relaxed ? 'min-h-[96px]' : ''}`}>
        <p className="text-xs text-slate-500">{label}</p>
        {editable && !override ? (
          <input
            value={value}
            onChange={(event) => updateField(key, event.target.value)}
            className={`w-full bg-transparent outline-none ${compact ? 'text-xs' : 'text-sm'}`}
          />
        ) : (
          <p className={`${compact ? 'text-xs' : 'text-sm'} text-slate-700 dark:text-slate-100`}>{value || '—'}</p>
        )}
      </div>
    )
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-muted/60 bg-white shadow-sm dark:bg-dark-card">
      <div className="flex items-start justify-between border-b border-muted/40 p-4">
        <div className="flex items-start gap-3">
          <div className={`h-16 w-1.5 rounded-full ${transitBadge ? 'bg-warm' : 'bg-gradient-to-b from-secondary to-primary'}`} />
          <div>
            <p className="text-xs text-slate-500">{dateLabel ?? `Day ${dayPlan.dayNumber}`}</p>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">第 {dayPlan.dayNumber} 天 · {city.flag} {city.nameZh}</h3>
            {transitBadge ? <span className="mt-1 inline-block rounded-full bg-warm px-2 py-0.5 text-xs text-slate-700">{transitBadge.icon} 中转日</span> : null}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setExpanded((prev) => !prev)} className="rounded-full bg-muted/40 px-3 py-1 text-xs">{expanded ? '收起' : '展开'}</button>
          <button onClick={() => onRegenerate?.(dayPlan.dayNumber)} className="rounded-full bg-primary/20 px-3 py-1 text-xs text-primary">重新生成此天</button>
          <button onClick={() => onDelete?.(dayPlan.dayNumber)} className="rounded-full bg-red-100 px-3 py-1 text-xs text-red-600">删除</button>
        </div>
      </div>

      {expanded ? (
        <div className="space-y-3 p-4">
          {stayRecommendation ? (
            <div className="rounded-xl border border-purple/30 bg-purple/5 p-3 text-xs text-slate-700 dark:text-slate-100">
              <button className="w-full text-left" onClick={() => setShowStayDetails((v) => !v)}>
                🏨 推荐住在 {stayRecommendation.name}（{stayRecommendation.budgetRange}）— {stayRecommendation.description}
                <span className="ml-2 text-purple">{showStayDetails ? '▲ 收起' : '▼ 展开住宿对比'}</span>
              </button>
              {showStayDetails && stayAreas?.length ? (
                <div className="mt-2 space-y-2">
                  {stayAreas.map((area) => (
                    <div key={area.name} className="rounded-lg bg-white/70 p-2 dark:bg-dark-card/70">
                      <p className="text-sm font-medium">{area.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{area.bestFor} · {area.budgetRange}</p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-200">{area.description}</p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-200">优点：{area.pros.join('、')}</p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-200">注意：{area.cons.join('、')}</p>
                      <p className="mt-1 text-xs text-slate-500">周边：{area.nearbyAttractions.join('、')}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <a
                          href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(`${city.name} ${area.name}`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-secondary/30 px-2.5 py-1 text-[11px]"
                        >
                          Booking
                        </a>
                        <a
                          href={`https://www.airbnb.com/s/${encodeURIComponent(city.name)}--${encodeURIComponent(area.name)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-primary/20 px-2.5 py-1 text-[11px]"
                        >
                          Airbnb
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-2 md:grid-cols-3">
            {renderField(compact ? '早/上午' : '上午', 'morning', transitBadge?.morningText)}
            {renderField('下午', 'afternoon')}
            {renderField(compact ? '晚上/夜间' : '晚上', 'evening')}
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {renderField('餐厅推荐', 'restaurant')}
            {renderField('交通备注', 'transitNote', transitBadge?.text)}
          </div>

          {arrivalTransportTip ? (
            <div className="rounded-xl border border-secondary/30 bg-secondary/10 p-3 text-xs">
              <button className="w-full text-left text-slate-700 dark:text-slate-100" onClick={() => setShowTransportDetails((v) => !v)}>
                💡 到达后建议：{arrivalTransportTip.tips[0]?.content.slice(0, 42) ?? arrivalTransportTip.overview.slice(0, 42)}...
                <span className="ml-2 text-primary">{showTransportDetails ? '▲ 收起' : '▼ 展开完整交通指南'}</span>
              </button>
              {showTransportDetails ? (
                <div className="mt-2 space-y-1 text-slate-600 dark:text-slate-200">
                  {arrivalTransportTip.tips.map((tip) => (
                    <p key={tip.title}>• {tip.title}：{tip.content}</p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 border-t border-muted/40 pt-3">
            <WeatherBadge weather={city.weather} currentMonth={currentMonth} bestMonths={city.bestMonths} />
            <BudgetReference budgetPerDay={city.budgetPerDay} days={1} />
          </div>
        </div>
      ) : null}
    </article>
  )
}
