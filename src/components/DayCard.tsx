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
  hideActions?: boolean
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
  hideActions = false,
}: DayCardProps) {
  const [expanded, setExpanded] = useState(true)
  const [showStayDetails, setShowStayDetails] = useState(false)
  const [showTransportDetails, setShowTransportDetails] = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)
  const currentMonth = useMemo(() => new Date().getMonth() + 1, [])
  const checklistStorageKey = `city-checklist-${city.id}`

  void travelStyle
  const todayTip = city.dailyTips[dayPlan.dayNumber % city.dailyTips.length] ?? city.dailyTips[0]
  const todayPhoto = city.photoSpots[dayPlan.dayNumber % city.photoSpots.length] ?? city.photoSpots[0]
  const todayDishA = city.foodGuide.mustTry[dayPlan.dayNumber % city.foodGuide.mustTry.length]
  const todayDishB = city.foodGuide.mustTry[(dayPlan.dayNumber + 1) % city.foodGuide.mustTry.length]
  const todayRestaurant = city.foodGuide.restaurants[dayPlan.dayNumber % city.foodGuide.restaurants.length]
  const checklistItems = useMemo(
    () => [
      ...city.highlights.slice(0, 5).map((item) => ({ key: `s-${item}`, text: item, category: '景点' as const })),
      ...city.foodGuide.mustTry.map((item) => ({ key: `f-${item.name}`, text: `${item.name}（${item.nameZh}）`, category: '美食' as const })),
      ...city.mustDoExperiences.map((item) => ({ key: `e-${item}`, text: item, category: '体验' as const })),
    ],
    [city.foodGuide.mustTry, city.highlights, city.mustDoExperiences],
  )
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(checklistStorageKey) ?? '{}') as Record<string, boolean>
    } catch {
      return {}
    }
  })
  const checkedCount = checklistItems.filter((item) => checkedItems[item.key]).length

  void editable
  void onChange

  return (
    <article data-pdf-card="true" className="overflow-hidden rounded-2xl border border-muted/60 bg-white shadow-sm dark:bg-dark-card">
      <div className="flex items-start justify-between border-b border-muted/40 p-4">
        <div className="flex items-start gap-3">
          <div className={`h-16 w-1.5 rounded-full ${transitBadge ? 'bg-warm' : 'bg-gradient-to-b from-secondary to-primary'}`} />
          <div>
            <p className="text-xs text-slate-500">{dateLabel ?? `Day ${dayPlan.dayNumber}`}</p>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">第 {dayPlan.dayNumber} 天 · {city.flag} {city.nameZh}</h3>
            {transitBadge ? <span className="mt-1 inline-block rounded-full bg-warm px-2 py-0.5 text-xs text-slate-700">{transitBadge.icon} 中转日</span> : null}
          </div>
        </div>
        {!hideActions ? (
          <div className="no-pdf-hide flex gap-2">
            <button onClick={() => setExpanded((prev) => !prev)} className="rounded-full bg-muted/40 px-3 py-1 text-xs">{expanded ? '收起' : '展开'}</button>
            <button onClick={() => onRegenerate?.(dayPlan.dayNumber)} className="rounded-full bg-primary/20 px-3 py-1 text-xs text-primary">重新生成此天</button>
            <button onClick={() => onDelete?.(dayPlan.dayNumber)} className="rounded-full bg-red-100 px-3 py-1 text-xs text-red-600">删除</button>
          </div>
        ) : null}
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
                          href={`https://www.airbnb.com/s/${encodeURIComponent(`${city.name}--${city.country}`)}/homes`}
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

          <div className="space-y-2">
            <div className="min-h-[80px] rounded-lg bg-background/70 p-2">
              <p className="text-xs text-slate-500">🌅 上午</p>
              <p className="text-sm text-slate-700 dark:text-slate-100">{((transitBadge?.morningText ?? String(dayPlan.morning ?? '')) || '—').replace(/，/g, ' → ')}</p>
            </div>
            <div className="min-h-[80px] rounded-lg bg-background/70 p-2">
              <p className="text-xs text-slate-500">🌤️ 下午</p>
              <p className="text-sm text-slate-700 dark:text-slate-100">{String(dayPlan.afternoon ?? '').replace(/，/g, ' → ') || '—'}</p>
            </div>
            <div className="min-h-[80px] rounded-lg bg-background/70 p-2">
              <p className="text-xs text-slate-500">🌙 晚上</p>
              <p className="text-sm text-slate-700 dark:text-slate-100">{String(dayPlan.evening ?? '').replace(/，/g, ' → ') || '—'}</p>
            </div>
          </div>

          <div className="border-t border-muted/40 pt-2 text-sm text-slate-700 dark:text-slate-100">
            🍽️ 试试 {todayDishA?.name}（{todayDishA?.nameZh}）{todayDishB ? `、${todayDishB.name}` : ''} — 推荐 {todayRestaurant?.name}（{todayRestaurant?.priceRange}）
          </div>
          <div className="border-t border-muted/40 pt-2 text-sm text-slate-700 dark:text-slate-100">
            📷 今日拍照点：{todayPhoto?.name}（{todayPhoto?.bestTime}最佳）
          </div>
          <div className="border-t border-muted/40 pt-2 text-xs text-slate-500">
            💡 今日贴士：{todayTip}
          </div>
          <div className="border-t border-muted/40 pt-2 text-xs text-slate-500">
            交通备注：{transitBadge?.text ?? dayPlan.transitNote ?? '—'}
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

          <div className="rounded-xl border border-muted/50 bg-white/70 p-3 dark:bg-dark-card/70">
            <button className="w-full text-left text-sm font-medium" onClick={() => setShowChecklist((prev) => !prev)}>
              📋 {city.nameZh}打卡清单（{checkedCount}/{checklistItems.length}） {showChecklist ? '▲' : '▼'}
            </button>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/40">
              <div className="h-full bg-primary transition-all" style={{ width: `${(checkedCount / Math.max(checklistItems.length, 1)) * 100}%` }} />
            </div>
            {checkedCount === checklistItems.length && checklistItems.length > 0 ? (
              <p className="mt-2 text-xs text-emerald-700">🎉 {city.nameZh}全部打卡完成！</p>
            ) : null}
            {showChecklist ? (
              <div className="mt-2 grid gap-3 md:grid-cols-3">
                {(['景点', '美食', '体验'] as const).map((category) => (
                  <div key={category} className="space-y-1">
                    <p className="text-xs font-medium">{category === '景点' ? '🏛️ 必逛景点' : category === '美食' ? '🍽️ 必吃美食' : '📸 必打卡体验'}</p>
                    {checklistItems.filter((item) => item.category === category).map((item) => (
                      <label key={item.key} className="flex items-start gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={Boolean(checkedItems[item.key])}
                          onChange={(event) => {
                            const next = { ...checkedItems, [item.key]: event.target.checked }
                            setCheckedItems(next)
                            localStorage.setItem(checklistStorageKey, JSON.stringify(next))
                          }}
                        />
                        <span>{item.text}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-muted/40 pt-3">
            <WeatherBadge weather={city.weather} currentMonth={currentMonth} bestMonths={city.bestMonths} />
            <BudgetReference budgetPerDay={city.budgetPerDay} days={1} />
          </div>
        </div>
      ) : null}
    </article>
  )
}
