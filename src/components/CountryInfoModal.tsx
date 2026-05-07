import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import countryInfoData from '../data/country-info.json'
import citiesData from '../data/schengen-cities.json'
import { useUserStore } from '../stores/useUserStore'
import type { SchengenCity } from '../types/city'
import type { CountryInfoMap } from '../types/country-info'
import { getCountryHolidays } from '../hooks/useHolidayCheck'

interface CountryInfoModalProps {
  countryCode: string | null
  open: boolean
  onClose: () => void
  onViewCities?: (countryCode: string) => void
}

const infoMap = countryInfoData as CountryInfoMap
const allCities = citiesData as SchengenCity[]

const typeColor: Record<string, string> = {
  地标: 'bg-primary/25 text-primary',
  博物馆: 'bg-purple/25 text-purple',
  自然: 'bg-secondary/30 text-secondary',
  海滨: 'bg-sky-100 text-sky-700',
  宫殿: 'bg-accent/30 text-accent',
}

export default function CountryInfoModal({ countryCode, open, onClose, onViewCities }: CountryInfoModalProps) {
  const visitedCities = useUserStore((state) => state.visitedCities)
  const wishlist = useUserStore((state) => state.wishlist)
  const addToWishlist = useUserStore((state) => state.addToWishlist)
  const [openCustoms, setOpenCustoms] = useState<string[]>([])

  const info = countryCode ? infoMap[countryCode] : null
  const countryHolidays = countryCode ? getCountryHolidays(countryCode) : []

  const countryCities = useMemo(
    () => (countryCode ? allCities.filter((city) => city.countryCode === countryCode) : []),
    [countryCode],
  )
  const visitedCount = useMemo(() => {
    const visitedSet = new Set(visitedCities.map((item) => item.cityId))
    return countryCities.filter((city) => visitedSet.has(city.id)).length
  }, [countryCities, visitedCities])

  const unvisitedCountryCities = useMemo(() => {
    const visitedSet = new Set(visitedCities.map((item) => item.cityId))
    return countryCities.filter((city) => !visitedSet.has(city.id))
  }, [countryCities, visitedCities])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose, open])

  useEffect(() => {
    if (!info) return
    setOpenCustoms(info.etiquette.customs.slice(0, 2).map((item) => item.title))
  }, [info])

  if (!info) return null

  const progress = countryCities.length ? (visitedCount / countryCities.length) * 100 : 0
  const nowMonth = new Date().getMonth() + 1
  const nearMonths = new Set([((nowMonth + 10) % 12) + 1, nowMonth, (nowMonth % 12) + 1])

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-0 top-0 z-50 h-full w-full max-w-[400px] overflow-y-auto border-l border-muted/50 bg-background p-5 dark:bg-dark-bg sm:w-[400px]"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          >
            <button className="absolute right-4 top-4 text-xl" onClick={onClose}>×</button>

            <header className="mb-4">
              <h2 className="text-2xl font-semibold">{info.flag} {info.nameZh}</h2>
              <p className="text-sm text-slate-500">{info.name}</p>
              <p className="mt-2 text-xs text-slate-600">已探索 {visitedCount}/{countryCities.length} 城</p>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted/40">
                <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
              {visitedCount === 0 ? <p className="mt-2 text-xs text-purple">尚未踏足，期待你的探索 ✨</p> : null}
            </header>

            <section className="mb-4">
              <h3 className="mb-1 font-medium">国家简介</h3>
              <p className="text-sm text-slate-700 dark:text-slate-200">{info.description}</p>
              <span className="mt-2 inline-block rounded-full bg-warm px-3 py-1 text-xs">最佳季节：{info.bestSeasons}</span>
            </section>

            <section className="mb-4">
              <h3 className="mb-2 font-medium">🏛️ 必去景点</h3>
              <div className="space-y-1 text-sm">
                {info.highlights.map((item) => (
                  <div key={`${item.name}-${item.city}`} className="flex items-center gap-2 rounded-lg bg-white/80 p-2 dark:bg-dark-card">
                    <span className="flex-1">{item.name}</span>
                    <span className="rounded-full bg-muted/30 px-2 py-0.5 text-[11px]">{item.city}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${typeColor[item.type] ?? 'bg-muted/30'}`}>{item.type}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-4">
              <h3 className="mb-2 font-medium">🍽️ 经典美食</h3>
              <div className="space-y-2">
                {info.cuisine.map((item) => (
                  <div key={item.name} className="rounded-lg bg-warm/70 p-2">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-200">{item.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-4">
              <h3 className="mb-2 font-medium">💰 小费指南</h3>
              <div className="rounded-lg border border-muted/50 bg-white/80 p-3 text-xs dark:bg-dark-card">
                <p>餐厅：{info.etiquette.tipping.restaurant}</p>
                <p className="mt-1">咖啡馆：{info.etiquette.tipping.cafe}</p>
                <p className="mt-1">出租车：{info.etiquette.tipping.taxi}</p>
                <p className="mt-1">酒店：{info.etiquette.tipping.hotel}</p>
                <p className="mt-1">导游：{info.etiquette.tipping.tour}</p>
              </div>
            </section>

            <section className="mb-4">
              <h3 className="mb-2 font-medium">🤝 当地习俗</h3>
              <div className="space-y-2">
                {info.etiquette.customs.map((custom) => {
                  const opened = openCustoms.includes(custom.title)
                  return (
                    <div key={custom.title} className="rounded-lg border border-muted/50 bg-white/80 p-2 text-xs dark:bg-dark-card">
                      <button
                        className="flex w-full items-center justify-between text-left"
                        onClick={() => {
                          setOpenCustoms((prev) =>
                            prev.includes(custom.title) ? prev.filter((item) => item !== custom.title) : [...prev, custom.title],
                          )
                        }}
                      >
                        <span>{custom.title}</span>
                        <span>{opened ? '▲' : '▼'}</span>
                      </button>
                      {opened ? <p className="mt-1 text-slate-600 dark:text-slate-200">{custom.content}</p> : null}
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="mb-4">
              <h3 className="mb-2 font-medium">🗣️ 实用短语</h3>
              <div className="rounded-lg border border-muted/50 bg-white/80 p-2 text-xs dark:bg-dark-card">
                {info.etiquette.usefulPhrases.map((phrase) => (
                  <div key={phrase.local} className="grid grid-cols-[1fr_auto] gap-2 border-b border-muted/30 py-1 last:border-0">
                    <span>{phrase.local}</span>
                    <span className="text-slate-500">{phrase.meaning}</span>
                  </div>
                ))}
                <p className="mt-2 text-[11px] text-slate-500">即使发音不标准，当地人也会感激你的尝试 😊</p>
              </div>
            </section>

            <section className="mb-5">
              <h3 className="mb-2 font-medium">🆘 紧急电话</h3>
              <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{info.etiquette.emergencyNumber}</p>
            </section>

            <section className="mb-5">
              <h3 className="mb-2 font-medium">📅 公共假日</h3>
              <div className="space-y-1 text-xs">
                <div className="grid grid-cols-[70px_1fr_1fr] gap-2 px-2 text-slate-500">
                  <span>日期</span>
                  <span>名称</span>
                  <span>影响</span>
                </div>
                {countryHolidays.map((holiday) => {
                  const holidayMonth = /^\d{2}-\d{2}$/.test(holiday.date) ? Number(holiday.date.slice(0, 2)) : undefined
                  const highlighted = holidayMonth ? nearMonths.has(holidayMonth) : false
                  return (
                    <div
                      key={`${holiday.date}-${holiday.name}`}
                      className={`grid grid-cols-[70px_1fr_1fr] gap-2 rounded-lg px-2 py-1 ${highlighted ? 'bg-amber-50' : 'bg-white/80 dark:bg-dark-card'}`}
                    >
                      <span>{holiday.date}</span>
                      <span>{holiday.name}</span>
                      <span className="text-slate-500">{holiday.impact}</span>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="mb-5">
              <h3 className="mb-2 font-medium">💡 冷知识</h3>
              <ul className="space-y-1 text-sm">
                {info.funFacts.map((fact) => <li key={fact}>💡 {fact}</li>)}
              </ul>
            </section>

            <div className="flex flex-wrap gap-2">
              <button className="rounded-full bg-primary px-4 py-2 text-xs text-white" onClick={() => onViewCities?.(countryCode!)}>查看该国所有城市</button>
              <button
                className="rounded-full bg-secondary px-4 py-2 text-xs"
                onClick={() => {
                  unvisitedCountryCities.forEach((city) => {
                    if (!wishlist.includes(city.id)) addToWishlist(city.id)
                  })
                }}
              >
                加入心愿单
              </button>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
