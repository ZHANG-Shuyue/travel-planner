import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import type { SchengenCity } from '../types/city'
import { useUserStore } from '../stores/useUserStore'
import BudgetReference from './BudgetReference'
import InspirationLinks from './InspirationLinks'
import { getClosureNotes, getCountryHolidays } from '../hooks/useHolidayCheck'

interface CityInfoPanelProps {
  city?: SchengenCity | null
  open: boolean
  onClose: () => void
}

const monthMap = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

export default function CityInfoPanel({ city, open, onClose }: CityInfoPanelProps) {
  const addToWishlist = useUserStore((state) => state.addToWishlist)
  const removeFromWishlist = useUserStore((state) => state.removeFromWishlist)
  const isInWishlist = useUserStore((state) => state.isInWishlist)
  const [openStayArea, setOpenStayArea] = useState<string | null>(null)
  const [openTransportTip, setOpenTransportTip] = useState<string | null>(null)

  if (!city) return null
  const wished = isInWishlist(city.id)
  const closureNotes = getClosureNotes(city.countryCode)
  const upcomingHolidays = getCountryHolidays(city.countryCode).filter((item) => {
    if (!/^\d{2}-\d{2}$/.test(item.date)) return false
    const [month, day] = item.date.split('-').map(Number)
    const now = new Date()
    const thisYear = new Date(now.getFullYear(), month - 1, day)
    const nextYear = new Date(now.getFullYear() + 1, month - 1, day)
    const diffThis = Math.abs(thisYear.getTime() - now.getTime()) / (1000 * 3600 * 24)
    const diffNext = Math.abs(nextYear.getTime() - now.getTime()) / (1000 * 3600 * 24)
    return Math.min(diffThis, diffNext) <= 30
  })

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l border-muted/50 bg-background p-5 dark:bg-dark-bg"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 250, damping: 28 }}
          >
            <button className="absolute right-4 top-4 text-xl" onClick={onClose}>
              ×
            </button>

            <header className="mb-4">
              <h2 className="font-title text-3xl text-slate-800 dark:text-slate-100">
                {city.flag} {city.nameZh}
              </h2>
              <p className="text-sm text-slate-500">{city.name} · {city.countryZh}</p>
            </header>

            <button
              className="mb-4 rounded-full bg-purple/20 px-4 py-1.5 text-sm text-purple"
              onClick={() => (wished ? removeFromWishlist(city.id) : addToWishlist(city.id))}
            >
              {wished ? '★ 已收藏' : '☆ 加入心愿单'}
            </button>

            <section className="mb-4">
              <h3 className="mb-2 font-medium">城市亮点</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
                {city.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="mb-4">
              <h3 className="mb-2 font-medium">周边一日游</h3>
              <div className="space-y-2">
                {city.dayTrips.map((trip) => (
                  <div key={trip.name} className="rounded-xl border border-secondary/40 bg-secondary/10 p-3">
                    <p className="text-sm font-medium">{trip.name} · {trip.nameEn}</p>
                    <p className="mt-1 text-xs text-slate-500">{trip.distance} · {trip.duration}</p>
                    <p className="mt-1 text-xs text-slate-700 dark:text-slate-200">{trip.highlights}</p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">交通：{trip.transport}</p>
                    <p className="mt-1 text-xs text-slate-500">建议停留：{trip.recommendedHours}小时 · 适合 {trip.bestFor.join('/')}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-4">
              <h3 className="mb-2 font-medium">🏨 住哪里</h3>
              <div className="space-y-2">
                {city.stayAreas.map((area) => {
                  const opened = openStayArea === area.name
                  const bookingLink = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(`${city.name} ${area.name}`)}`
                  const airbnbLink = `https://www.airbnb.com/s/${encodeURIComponent(city.name)}--${encodeURIComponent(area.name)}`
                  return (
                    <div key={area.name} className="rounded-xl border border-muted/50 bg-white/80 p-3 dark:bg-dark-card">
                      <button className="w-full text-left" onClick={() => setOpenStayArea((prev) => (prev === area.name ? null : area.name))}>
                        <p className="text-sm font-medium">{area.name}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{area.description}</p>
                        <p className="mt-1 text-xs text-slate-500">{area.budgetRange} · 适合：{area.bestFor} {opened ? '▲' : '▼'}</p>
                      </button>
                      {opened ? (
                        <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-200">
                          <p>优点：{area.pros.join('、')}</p>
                          <p>注意：{area.cons.join('、')}</p>
                          <p>周边：{area.nearbyAttractions.join('、')}</p>
                          <div className="mt-2 flex gap-2">
                            <a href={bookingLink} target="_blank" rel="noreferrer" className="rounded-full bg-secondary/30 px-3 py-1 text-[11px]">搜索该区域住宿</a>
                            <a href={airbnbLink} target="_blank" rel="noreferrer" className="rounded-full bg-primary/20 px-3 py-1 text-[11px]">Airbnb</a>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="mb-4">
              <h3 className="mb-2 font-medium">🚇 当地交通</h3>
              <div className="rounded-xl border border-muted/50 bg-white/80 p-3 text-sm dark:bg-dark-card">
                <p className="text-slate-700 dark:text-slate-100">{city.localTransport.overview}</p>
                <div className="mt-3 space-y-2">
                  {city.localTransport.tips.map((tip) => {
                    const opened = openTransportTip === tip.title
                    return (
                      <div key={tip.title} className="rounded-lg bg-background/80 p-2 dark:bg-dark-bg">
                        <button className="flex w-full items-center justify-between text-left text-xs font-medium" onClick={() => setOpenTransportTip((prev) => (prev === tip.title ? null : tip.title))}>
                          <span>{tip.title}</span>
                          <span>{opened ? '▲' : '▼'}</span>
                        </button>
                        {opened ? <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{tip.content}</p> : null}
                      </div>
                    )
                  })}
                </div>
                {city.localTransport.passes.length ? (
                  <div className="mt-3 space-y-2">
                    {city.localTransport.passes.map((pass) => (
                      <div key={pass.name} className="rounded-lg border border-secondary/40 bg-secondary/10 p-2 text-xs">
                        <p className="font-medium">{pass.name}</p>
                        <p>{pass.price}</p>
                        <p className="mt-1">包含：{pass.includes}</p>
                        <p className="mt-1">建议：{pass.worthIt}</p>
                        <a href={pass.link} target="_blank" rel="noreferrer" className="mt-1 inline-block text-primary underline">查看购买链接</a>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="mb-4">
              <h3 className="mb-2 font-medium">⚠️ 当地提醒</h3>
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs">
                <ul className="list-disc space-y-1 pl-4">
                  {closureNotes.map((note) => <li key={note}>{note}</li>)}
                </ul>
                {upcomingHolidays.length ? (
                  <div className="mt-2 space-y-1">
                    {upcomingHolidays.map((item) => (
                      <p key={item.name} className="rounded bg-amber-100 px-2 py-1 text-amber-800">
                        {item.name} 即将到来（{item.date}），届时{item.impact}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="mb-4">
              <h3 className="mb-2 font-medium">四季天气</h3>
              <div className="grid gap-2 text-sm">
                {Object.entries(city.weather).map(([season, data]) => (
                  <div key={season} className="rounded-lg bg-white/80 p-2 dark:bg-dark-card">
                    <p className="font-medium capitalize">
                      {season} · {data.avgTemp}°C
                    </p>
                    <p className="text-xs text-slate-500">降水：{data.rainfall}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{data.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-4">
              <h3 className="mb-2 font-medium">最佳旅行月份</h3>
              <div className="flex flex-wrap gap-2">
                {city.bestMonths.map((month) => (
                  <span key={month} className="rounded-full bg-secondary/30 px-3 py-1 text-xs">
                    {monthMap[month - 1]}
                  </span>
                ))}
              </div>
            </section>

            <section className="mb-4">
              <BudgetReference budgetPerDay={city.budgetPerDay} days={city.avgDaysRecommended} />
            </section>

            <section>
              <InspirationLinks nameZh={city.nameZh} name={city.name} />
            </section>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
