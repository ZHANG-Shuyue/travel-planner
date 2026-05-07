import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import citiesData from '../data/schengen-cities.json'
import BudgetReference from '../components/BudgetReference'
import InspirationLinks from '../components/InspirationLinks'
import SpinWheel from '../components/SpinWheel'
import WeatherBadge from '../components/WeatherBadge'
import { useUserStore } from '../stores/useUserStore'
import type { SchengenCity } from '../types/city'

const allCities = citiesData as SchengenCity[]
const tags = ['文化', '美食', '自然', '海滨', '城市探索', '小众冒险']

export default function RandomWheel() {
  const navigate = useNavigate()
  const visitedCities = useUserStore((state) => state.visitedCities)
  const visited = visitedCities.map((item) => item.cityId)
  const addToWishlist = useUserStore((state) => state.addToWishlist)

  const [showFilter, setShowFilter] = useState(false)
  const [minDays, setMinDays] = useState(1)
  const [maxDays, setMaxDays] = useState(7)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [excludeVisited, setExcludeVisited] = useState(true)
  const [spinSignal, setSpinSignal] = useState(0)
  const [winner, setWinner] = useState<SchengenCity | null>(null)

  const candidates = useMemo(() => {
    return allCities.filter((city) => {
      if (excludeVisited && visited.includes(city.id)) return false
      if (city.avgDaysRecommended < minDays || city.avgDaysRecommended > maxDays) return false
      if (!selectedTags.length) return true
      const text = `${city.vibes.join(' ')} ${city.highlights.join(' ')}`
      return selectedTags.some((tag) => text.includes(tag.slice(0, 2)) || text.includes(tag))
    })
  }, [excludeVisited, maxDays, minDays, selectedTags, visited])

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-muted/60 bg-white p-5 text-center dark:bg-dark-card">
        <h1 className="font-handwrite text-5xl text-purple">去哪儿？命运来决定！</h1>
        <p className="text-sm text-slate-500">转一转，遇见你的下一站</p>
      </section>

      <section className="rounded-2xl border border-muted/60 bg-white p-4 dark:bg-dark-card">
        <button className="text-sm text-primary" onClick={() => setShowFilter((v) => !v)}>
          {showFilter ? '收起约束条件' : '展开约束条件'}
        </button>
        {showFilter ? (
          <div className="mt-3 space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
              <label className="text-sm">最少天数
                <input type="number" min={1} max={30} value={minDays} onChange={(e) => setMinDays(Number(e.target.value) || 1)} className="mt-1 w-full rounded border border-muted/60 px-2 py-1" />
              </label>
              <label className="text-sm">最多天数
                <input type="number" min={1} max={30} value={maxDays} onChange={(e) => setMaxDays(Number(e.target.value) || 1)} className="mt-1 w-full rounded border border-muted/60 px-2 py-1" />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button key={tag} className={`rounded-full px-3 py-1 text-xs ${selectedTags.includes(tag) ? 'bg-primary text-white' : 'bg-muted/40'}`} onClick={() => setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])}>{tag}</button>
              ))}
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={excludeVisited} onChange={(e) => setExcludeVisited(e.target.checked)} /> 排除已去过城市
            </label>
          </div>
        ) : null}
      </section>

      <section className="space-y-3 rounded-2xl border border-muted/60 bg-white p-4 text-center dark:bg-dark-card">
        <SpinWheel
          cities={allCities}
          unvisitedCityIds={candidates.map((city) => city.id)}
          showInternalButton={false}
          showInternalResult={false}
          spinSignal={spinSignal}
          onWinnerChange={setWinner}
        />
        <button className="rounded-full bg-purple px-5 py-2 text-sm text-white" onClick={() => setSpinSignal((v) => v + 1)}>
          转一转 🎲
        </button>
      </section>

      {winner ? (
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 rounded-2xl border border-muted/60 bg-white p-4 dark:bg-dark-card">
          <div>
            <h3 className="text-xl font-semibold">{winner.flag} {winner.nameZh} · {winner.name}</h3>
            <p className="text-sm text-slate-500">{winner.countryZh}</p>
          </div>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {winner.highlights.map((h) => <li key={h}>{h}</li>)}
          </ul>
          <div className="flex flex-wrap gap-2">
            <WeatherBadge weather={winner.weather} bestMonths={winner.bestMonths} currentMonth={new Date().getMonth() + 1} />
            <BudgetReference budgetPerDay={winner.budgetPerDay} days={winner.avgDaysRecommended} />
          </div>
          <InspirationLinks name={winner.name} nameZh={winner.nameZh} country={winner.country} />
          <div className="flex flex-wrap gap-2">
            <button className="rounded-full bg-primary px-4 py-2 text-xs text-white" onClick={() => navigate('/planner', { state: { requiredCityIds: [winner.id] } })}>以此开始规划</button>
            <button className="rounded-full bg-secondary px-4 py-2 text-xs" onClick={() => addToWishlist(winner.id)}>加入心愿单</button>
            <button className="rounded-full bg-muted/40 px-4 py-2 text-xs" onClick={() => setSpinSignal((v) => v + 1)}>不喜欢，再转一次</button>
          </div>
        </motion.section>
      ) : null}
    </div>
  )
}
