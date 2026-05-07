import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import countryInfoData from '../data/country-info.json'
import SchengenMap from '../components/SchengenMap'
import ShareCard from '../components/ShareCard'
import CountryInfoModal from '../components/CountryInfoModal'
import AddCustomCityModal from '../components/AddCustomCityModal'
import { useUserStore } from '../stores/useUserStore'
import type { SchengenCity } from '../types/city'
import type { CountryInfoMap } from '../types/country-info'
import type { CustomCity, VisitedCity } from '../types/user'

const countryInfo = countryInfoData as CountryInfoMap

type DisplayCity = SchengenCity | (Partial<SchengenCity> & CustomCity & { nameZh: string; countryZh: string; flag: string })

function scoreStars(value: number, onClick: (rating: number) => void) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((score) => (
        <button key={score} type="button" onClick={() => onClick(score)} className={`text-sm ${score <= value ? 'text-amber-500' : 'text-slate-300'}`}>★</button>
      ))}
    </div>
  )
}

function summaryText(draft: Partial<VisitedCity>) {
  const pieces: string[] = []
  if (draft.duration) pieces.push(`${draft.duration}天`)
  if (draft.rating) pieces.push(`⭐${draft.rating}`)
  if (draft.comment?.trim()) {
    const short = draft.comment.trim().slice(0, 30)
    pieces.push(`备注：${short}${draft.comment.trim().length > 30 ? '...' : ''}`)
  }
  return pieces.join(' · ')
}

export default function MyFootprints() {
  const visitedCities = useUserStore((state) => state.visitedCities)
  const wishlist = useUserStore((state) => state.wishlist)
  const customCities = useUserStore((state) => state.customCities)
  const toggleVisited = useUserStore((state) => state.toggleVisited)
  const updateVisitedCity = useUserStore((state) => state.updateVisitedCity)
  const addToWishlist = useUserStore((state) => state.addToWishlist)
  const removeFromWishlist = useUserStore((state) => state.removeFromWishlist)
  const updateCustomCity = useUserStore((state) => state.updateCustomCity)
  const deleteCustomCity = useUserStore((state) => state.deleteCustomCity)
  const getAllCities = useUserStore((state) => state.getAllCities)
  const getVisitedCountryCount = useUserStore((state) => state.getVisitedCountryCount)
  const getCitiesByCountry = useUserStore((state) => state.getCitiesByCountry)

  const [query, setQuery] = useState('')
  const [openCountries, setOpenCountries] = useState<Record<string, boolean>>({})
  const [drafts, setDrafts] = useState<Record<string, Partial<VisitedCity>>>({})
  const [showShare, setShowShare] = useState(false)
  const [expandedEditorId, setExpandedEditorId] = useState<string | null>(null)
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null)
  const [showAddCityModal, setShowAddCityModal] = useState(false)
  const [addCityDefaultCountryCode, setAddCityDefaultCountryCode] = useState<string | undefined>(undefined)
  const [toast, setToast] = useState<string | null>(null)
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null)
  const [editingCustomName, setEditingCustomName] = useState('')

  const timersRef = useRef<Record<string, number>>({})
  const editorRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const countrySectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    return () => Object.values(timersRef.current).forEach((timer) => window.clearTimeout(timer))
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!expandedEditorId) return
      const container = editorRefs.current[expandedEditorId]
      const target = event.target as Node | null
      if (container && target && !container.contains(target)) setExpandedEditorId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [expandedEditorId])

  const allCities = useMemo(() => getAllCities() as DisplayCity[], [customCities, getAllCities])
  const cityMap = useMemo(() => new Map(allCities.map((city) => [city.id, city])), [allCities])

  const visitedMap = useMemo(() => visitedCities.reduce<Record<string, VisitedCity>>((acc, item) => { acc[item.cityId] = item; return acc }, {}), [visitedCities])

  const countryCodes = useMemo(() => Object.keys(countryInfo).sort((a, b) => (countryInfo[a]?.nameZh ?? '').localeCompare(countryInfo[b]?.nameZh ?? '')), [])

  const grouped = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return countryCodes.reduce<Record<string, DisplayCity[]>>((acc, code) => {
      const list = getCitiesByCountry(code) as DisplayCity[]
      const filtered = list.filter((city) => {
        const country = countryInfo[code]
        const text = `${city.nameZh ?? ''} ${city.name ?? ''} ${country?.nameZh ?? ''} ${country?.name ?? ''}`.toLowerCase()
        return !keyword || text.includes(keyword)
      })
      if (filtered.length) acc[code] = filtered
      return acc
    }, {})
  }, [countryCodes, getCitiesByCountry, query, customCities])

  const countries = useMemo(() => Object.keys(grouped), [grouped])

  const stats = useMemo(() => {
    const visitedIds = visitedCities.map((item) => item.cityId)
    const countriesCount = getVisitedCountryCount()
    const duration = visitedCities.reduce((sum, item) => sum + (item.duration ?? 0), 0)
    const countryVisitCounter = visitedIds.reduce<Record<string, number>>((acc, cityId) => {
      const country = cityMap.get(cityId)?.countryZh
      if (!country) return acc
      acc[country] = (acc[country] ?? 0) + 1
      return acc
    }, {})
    const mostVisited = Object.entries(countryVisitCounter).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '暂无数据'
    return { visitedCountries: countriesCount, visitedCities: visitedIds.length, totalCities: allCities.length, totalDuration: duration, mostVisited, visitedIds }
  }, [allCities.length, cityMap, getVisitedCountryCount, visitedCities])

  const handleToggleVisited = (cityId: string) => {
    const wasVisited = Boolean(visitedMap[cityId])
    toggleVisited(cityId)
    const countryCode = cityMap.get(cityId)?.countryCode
    if (countryCode) setOpenCountries((prev) => ({ ...prev, [countryCode]: true }))
    if (wasVisited && expandedEditorId === cityId) setExpandedEditorId(null)
  }

  const handleDraftChange = (cityId: string, patch: Partial<VisitedCity>) => {
    setDrafts((prev) => {
      const base = visitedMap[cityId] ?? { cityId }
      const next = { ...base, ...(prev[cityId] ?? {}), ...patch }
      const merged = { ...prev, [cityId]: next }
      if (timersRef.current[cityId]) window.clearTimeout(timersRef.current[cityId])
      timersRef.current[cityId] = window.setTimeout(() => updateVisitedCity(cityId, merged[cityId]), 500)
      return merged
    })
  }

  const handleViewCountryCities = (countryCode: string) => {
    setSelectedCountryCode(null)
    setOpenCountries((prev) => ({ ...prev, [countryCode]: true }))
    window.setTimeout(() => {
      countrySectionRefs.current[countryCode]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-5">
        <section className="space-y-3 rounded-2xl border border-muted/60 bg-white p-4 lg:col-span-2 dark:bg-dark-card">
          <div className="flex items-center gap-2">
            <input className="flex-1 rounded-xl border border-muted/60 px-3 py-2 text-sm outline-none focus:border-primary" placeholder="搜索城市或国家..." value={query} onChange={(event) => setQuery(event.target.value)} />
            <button
              className="rounded-full bg-[#9b8ea8] px-3 py-1.5 text-xs text-white"
              onClick={() => {
                setAddCityDefaultCountryCode(undefined)
                setShowAddCityModal(true)
              }}
            >
              + 添加城市
            </button>
          </div>

          <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
            {countries.map((countryCode) => {
              const list = grouped[countryCode]
              const countryZh = countryInfo[countryCode]?.nameZh ?? countryCode
              const flag = countryInfo[countryCode]?.flag ?? '🏳️'
              const visitedCount = list.filter((city) => visitedMap[city.id]).length
              const isOpen = openCountries[countryCode] ?? visitedCount > 0

              return (
                <div key={countryCode} ref={(el) => { countrySectionRefs.current[countryCode] = el }} className="overflow-hidden rounded-xl border border-muted/50">
                  <button className="flex w-full items-center justify-between bg-background/70 px-3 py-2 text-left" onClick={() => setOpenCountries((prev) => ({ ...prev, [countryCode]: !isOpen }))}>
                    <span className="text-sm font-medium">{flag} {countryZh}</span>
                    <span className="rounded-full bg-muted/50 px-2 py-0.5 text-xs">{visitedCount}/{list.length} 城已去</span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div key="content" initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="space-y-1 p-2">
                          {list.map((city) => {
                            const visited = visitedMap[city.id]
                            const draft = drafts[city.id] ?? visited ?? { cityId: city.id }
                            const wished = wishlist.includes(city.id)
                            const isExpanded = expandedEditorId === city.id
                            const compactSummary = summaryText(draft)
                            const isCustom = Boolean((city as DisplayCity & { isCustom?: boolean }).isCustom)

                            return (
                              <div key={city.id} ref={(el) => { editorRefs.current[city.id] = el }} className="rounded-lg border border-transparent p-1 hover:bg-background/60">
                                <div className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${visited ? 'bg-secondary/25' : ''}`}>
                                  <input type="checkbox" checked={Boolean(visited)} onChange={() => handleToggleVisited(city.id)} />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm">
                                      {city.nameZh}
                                      {!isCustom && city.name ? <span className="text-slate-400"> {city.name}</span> : null}
                                      {isCustom ? <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600">自定义</span> : null}
                                      {visited ? <span className="ml-2 text-xs text-emerald-700">✓ 已去过</span> : null}
                                    </p>
                                    {visited && compactSummary ? <p className="truncate text-xs text-slate-500">{compactSummary}</p> : null}
                                  </div>

                                  {visited ? <button className="rounded-full bg-muted/40 px-2 py-0.5 text-xs" onClick={(e) => { e.stopPropagation(); setExpandedEditorId((prev) => (prev === city.id ? null : city.id)) }}>{isExpanded ? '▲ 收起' : '✏️ 展开编辑'}</button> : null}
                                  <button className={`text-sm ${wished ? 'text-purple' : 'text-slate-300'}`} onClick={() => (wished ? removeFromWishlist(city.id) : addToWishlist(city.id))}>{wished ? '★' : '☆'}</button>
                                  {isCustom ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        className="text-xs text-slate-500"
                                        onClick={() => {
                                          setEditingCustomId(city.id)
                                          setEditingCustomName(city.nameZh ?? '')
                                        }}
                                      >
                                        编辑
                                      </button>
                                      <button
                                        className="text-xs text-red-500"
                                        onClick={() => {
                                          if (window.confirm('确定删除该城市？相关备注记录也将一并清除')) {
                                            deleteCustomCity(city.id)
                                            setToast(`已删除 ${city.nameZh}`)
                                          }
                                        }}
                                      >
                                        删除
                                      </button>
                                    </div>
                                  ) : null}
                                </div>

                                {isCustom && editingCustomId === city.id ? (
                                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-background/70 p-2">
                                    <input className="flex-1 rounded border border-muted/60 px-2 py-1 text-xs" value={editingCustomName} onChange={(e) => setEditingCustomName(e.target.value)} />
                                    <button
                                      className="rounded-full bg-primary px-2.5 py-1 text-xs text-white"
                                      onClick={() => {
                                        if (!editingCustomName.trim()) return
                                        updateCustomCity(city.id, editingCustomName.trim())
                                        setEditingCustomId(null)
                                      }}
                                    >
                                      保存
                                    </button>
                                    <button className="text-xs text-slate-500" onClick={() => setEditingCustomId(null)}>取消</button>
                                  </div>
                                ) : null}

                                <AnimatePresence>
                                  {visited && isExpanded ? (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                      <div className="mt-2 grid gap-2 rounded-lg bg-background/60 p-2">
                                        <label className="text-xs">访问日期<input type="date" className="mt-1 w-full rounded border border-muted/60 bg-white px-2 py-1" value={draft.visitDate ?? ''} onChange={(event) => handleDraftChange(city.id, { visitDate: event.target.value })} /></label>
                                        <label className="text-xs">停留天数<input type="number" min={1} max={30} className="mt-1 w-full rounded border border-muted/60 bg-white px-2 py-1" value={draft.duration ?? ''} onChange={(event) => handleDraftChange(city.id, { duration: Number(event.target.value) || undefined })} /></label>
                                        <div className="text-xs">我的评分<div className="mt-1">{scoreStars(draft.rating ?? 0, (rating) => handleDraftChange(city.id, { rating }))}</div></div>
                                        <label className="text-xs">备注 Comments<textarea className="mt-1 h-20 w-full rounded border border-muted/60 bg-white px-2 py-1" placeholder="记录你的感受、推荐、路线备注...（可选）" value={draft.comment ?? ''} onChange={(event) => handleDraftChange(city.id, { comment: event.target.value })} /></label>
                                      </div>
                                    </motion.div>
                                  ) : null}
                                </AnimatePresence>
                              </div>
                            )
                          })}

                          <button
                            className="mt-1 text-xs text-[#8f819e] underline"
                            onClick={() => {
                              setAddCityDefaultCountryCode(countryCode)
                              setShowAddCityModal(true)
                            }}
                          >
                            + 添加该国其他城市
                          </button>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-muted/60 bg-white p-3 lg:col-span-3 dark:bg-dark-card">
          <SchengenMap
            visitedCityIds={stats.visitedIds}
            wishlistCityIds={wishlist}
            onCityClick={handleToggleVisited}
            onCountryClick={(code) => setSelectedCountryCode(code)}
          />
        </section>
      </div>

      <section className="rounded-2xl border border-muted/60 bg-white p-4 dark:bg-dark-card">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="rounded-xl bg-background/70 p-3"><p className="text-xs text-slate-500">已去国家</p><p className="text-xl font-semibold">{stats.visitedCountries}/27</p></div>
          <div className="rounded-xl bg-background/70 p-3"><p className="text-xs text-slate-500">已去城市</p><p className="text-xl font-semibold">{stats.visitedCities}/{stats.totalCities}</p></div>
          <div className="rounded-xl bg-background/70 p-3"><p className="text-xs text-slate-500">累计旅行天数</p><p className="text-xl font-semibold">{stats.totalDuration} 天</p></div>
          <div className="rounded-xl bg-background/70 p-3"><p className="text-xs text-slate-500">最常去国家</p><p className="text-xl font-semibold">{stats.mostVisited}</p></div>
          <div className="flex items-center justify-center"><button className="rounded-full bg-purple px-5 py-2 text-sm text-white" onClick={() => setShowShare((prev) => !prev)}>生成分享图</button></div>
        </div>

        <AnimatePresence>
          {showShare ? <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="mt-3"><ShareCard visitedCityIds={stats.visitedIds} /></div></motion.div> : null}
        </AnimatePresence>
      </section>

      <CountryInfoModal
        countryCode={selectedCountryCode}
        open={Boolean(selectedCountryCode)}
        onClose={() => setSelectedCountryCode(null)}
        onViewCities={handleViewCountryCities}
      />

      <AddCustomCityModal
        open={showAddCityModal}
        onClose={() => setShowAddCityModal(false)}
        defaultCountryCode={addCityDefaultCountryCode}
        onAdded={(cityName, countryCode) => {
          setOpenCountries((prev) => ({ ...prev, [countryCode]: true }))
          setToast(`已添加 ${cityName} 到 ${countryInfo[countryCode]?.nameZh ?? countryCode} ✓`)
        }}
      />

      <AnimatePresence>
        {toast ? (
          <motion.div
            className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 px-4 py-2 text-xs text-white"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
