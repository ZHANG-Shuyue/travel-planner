import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import citiesData from '../data/schengen-cities.json'
import ProgressBar from '../components/ProgressBar'
import SchengenMap from '../components/SchengenMap'
import VisaInfoSettings from '../components/VisaInfoSettings'
import { useUserStore } from '../stores/useUserStore'
import type { SchengenCity } from '../types/city'

const cities = citiesData as SchengenCity[]

export default function Dashboard() {
  const navigate = useNavigate()
  const visitedCities = useUserStore((state) => state.visitedCities)
  const customCities = useUserStore((state) => state.customCities)
  const savedPlans = useUserStore((state) => state.savedPlans)
  const countdown = useUserStore((state) => state.countdown)
  const setCountdown = useUserStore((state) => state.setCountdown)
  const getAllCities = useUserStore((state) => state.getAllCities)
  const getVisitedCountryCount = useUserStore((state) => state.getVisitedCountryCount)
  const visaInfo = useUserStore((state) => state.visaInfo)
  const visitedWithDuration = useUserStore((state) => state.visitedCities)
  const getRemainingVisaDays = useUserStore((state) => state.getRemainingVisaDays)
  const getVisaExpired = useUserStore((state) => state.getVisaExpired)

  const [dateDraft, setDateDraft] = useState(countdown?.date ?? '')
  const [destDraft, setDestDraft] = useState(countdown?.destination ?? '')
  const [showVisaModal, setShowVisaModal] = useState(false)

  const visitedIds = visitedCities.map((item) => item.cityId)
  const visitedCountries = getVisitedCountryCount()
  const totalCities = useMemo(() => getAllCities().length, [customCities, getAllCities])

  const latestPlans = [...savedPlans].slice(-2).reverse()
  const latestPlan = latestPlans[0]

  const daysLeft = useMemo(() => {
    if (!countdown?.date) return null
    const diff = Math.ceil((new Date(countdown.date).getTime() - Date.now()) / (1000 * 3600 * 24))
    return Math.max(0, diff)
  }, [countdown?.date])

  const remainingVisaDays = getRemainingVisaDays()
  const visaExpired = getVisaExpired()
  const autoUsedDays = useMemo(
    () => visitedWithDuration.reduce((sum, item) => sum + (item.duration ?? 0), 0),
    [visitedWithDuration],
  )
  const effectiveUsedDays = visaInfo?.autoCountFromFootprints ? autoUsedDays : (visaInfo?.usedDays ?? 0)
  const endDiffDays = useMemo(() => {
    if (!visaInfo?.visaEndDate) return null
    const end = new Date(visaInfo.visaEndDate)
    if (Number.isNaN(end.getTime())) return null
    return Math.ceil((end.getTime() - Date.now()) / (1000 * 3600 * 24))
  }, [visaInfo?.visaEndDate])

  const visaTone = useMemo(() => {
    if (visaExpired) return 'expired'
    if ((remainingVisaDays ?? 999) < 5 || (endDiffDays ?? 999) <= 7) return 'danger'
    if ((remainingVisaDays ?? 999) <= 15) return 'warn'
    return 'ok'
  }, [endDiffDays, remainingVisaDays, visaExpired])

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-muted/60 bg-white p-5 dark:bg-dark-card">
        <h1 className="font-handwrite text-5xl text-purple">申根漫游记</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">记录你的足迹，规划下一段旅程</p>
        <div className="mt-4">
          <ProgressBar
            visitedCountries={visitedCountries}
            visitedCities={visitedIds.length}
            totalCities={totalCities}
          />
        </div>
        {visaInfo?.enabled && typeof visaInfo.allowedDays === 'number' ? (
          <div
            className={`mt-4 flex items-start justify-between rounded-xl border p-3 text-sm ${
              visaTone === 'ok'
                ? 'border-[#c6d8be] bg-[#eef7eb]'
                : visaTone === 'warn'
                  ? 'border-amber-300 bg-amber-50'
                  : visaTone === 'danger'
                    ? 'animate-pulse border-rose-300 bg-rose-50'
                    : 'border-slate-300 bg-slate-100'
            }`}
          >
            <div className={visaTone === 'expired' ? 'line-through opacity-70' : ''}>
              <p className="text-base font-semibold">签证剩余：可停留 {remainingVisaDays ?? visaInfo.allowedDays - effectiveUsedDays} 天</p>
              {visaInfo.visaEndDate ? <p className="mt-1 text-xs text-slate-600">有效期至 {visaInfo.visaEndDate}</p> : null}
              <p className="mt-1 text-xs">
                {visaTone === 'ok'
                  ? '状态正常'
                  : visaTone === 'warn'
                    ? '注意安排行程'
                    : visaTone === 'danger'
                      ? '签证即将到期'
                      : '签证已过期，请更新信息'}
              </p>
            </div>
            <button className="rounded-full bg-white/80 px-3 py-1 text-xs" onClick={() => setShowVisaModal(true)}>
              编辑
            </button>
          </div>
        ) : (
          <button className="mt-4 rounded-full bg-muted/40 px-3 py-1.5 text-xs" onClick={() => setShowVisaModal(true)}>
            签证信息设置（可选）
          </button>
        )}
      </section>

      <section
        className="cursor-pointer rounded-2xl border border-muted/60 bg-white p-3 transition hover:shadow dark:bg-dark-card"
        onClick={() => navigate('/footprints')}
      >
        <p className="mb-2 text-sm text-slate-500">足迹地图预览（点击进入我的足迹）</p>
        <SchengenMap visitedCityIds={visitedIds} compact interactive={false} />
      </section>

      <section className="rounded-2xl border border-muted/60 bg-white p-4 dark:bg-dark-card">
        {countdown?.date && countdown?.destination ? (
          <div className="space-y-2">
            <p className="text-lg font-medium">距离下次旅行还有 {daysLeft ?? '-'} 天</p>
            <p className="text-sm text-slate-500">目的地：{countdown.destination}</p>
            <div className="grid gap-2 md:grid-cols-3">
              <input
                type="date"
                value={dateDraft}
                className="rounded border border-muted/60 px-2 py-1"
                onChange={(e) => setDateDraft(e.target.value)}
              />
              <input
                value={destDraft}
                className="rounded border border-muted/60 px-2 py-1"
                placeholder="目的地"
                onChange={(e) => setDestDraft(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  className="rounded-full bg-primary px-3 py-1 text-xs text-white"
                  onClick={() => setCountdown(dateDraft, destDraft)}
                >
                  保存
                </button>
                <button
                  className="rounded-full bg-red-100 px-3 py-1 text-xs text-red-600"
                  onClick={() => setCountdown('', '')}
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            className="rounded-full bg-primary px-4 py-2 text-sm text-white"
            onClick={() => setCountdown(new Date().toISOString().slice(0, 10), '巴黎')}
          >
            设置你的下次旅行日期
          </button>
        )}
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <button className="rounded-2xl border border-muted/60 bg-white p-4 text-left dark:bg-dark-card" onClick={() => navigate('/planner')}>
          <p className="font-medium">开始规划新旅行</p>
        </button>
        <button className="rounded-2xl border border-muted/60 bg-white p-4 text-left dark:bg-dark-card" onClick={() => navigate('/random')}>
          <p className="font-medium">转转转盘找灵感</p>
        </button>
        <button className="rounded-2xl border border-muted/60 bg-white p-4 text-left dark:bg-dark-card" onClick={() => navigate('/wishlist')}>
          <p className="font-medium">查看心愿单（{useUserStore.getState().wishlist.length} 城）</p>
        </button>
        <button className="rounded-2xl border border-muted/60 bg-white p-4 text-left dark:bg-dark-card" onClick={() => navigate('/planner')}>
          <p className="font-medium">最近保存的方案</p>
          <p className="mt-1 text-xs text-slate-500">{latestPlan ? `${latestPlan.name} · ${latestPlan.totalDays}天` : '暂无保存方案'}</p>
        </button>
      </section>

      {latestPlans.length ? (
        <section className="rounded-2xl border border-muted/60 bg-white p-4 dark:bg-dark-card">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-medium">最近行程摘要</h3>
            <button className="text-xs text-primary" onClick={() => navigate('/planner')}>查看全部方案</button>
          </div>
          <div className="space-y-2">
            {latestPlans.map((plan) => (
              <div key={plan.id} className="rounded-xl bg-background/60 p-3">
                <p className="text-sm font-medium">{plan.name}</p>
                <p className="text-xs text-slate-500">{plan.totalDays} 天 · {plan.cities.map((id) => cities.find((c) => c.id === id)?.nameZh ?? id).slice(0, 4).join(' · ')}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <AnimatePresence>
        {showVisaModal ? (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowVisaModal(false)} />
            <motion.div
              className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,700px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-4 dark:bg-dark-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold">签证信息设置（可选）</h3>
                <button onClick={() => setShowVisaModal(false)}>×</button>
              </div>
              <VisaInfoSettings />
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
