import { useMemo, useRef } from 'react'
import { toPng } from 'html-to-image'
import citiesData from '../data/schengen-cities.json'
import { useUserStore } from '../stores/useUserStore'
import type { SchengenCity } from '../types/city'

interface ShareCardProps {
  visitedCityIds: string[]
  showButton?: boolean
  triggerLabel?: string
  onGenerated?: () => void
}

const allCities = citiesData as SchengenCity[]

export default function ShareCard({
  visitedCityIds,
  showButton = true,
  triggerLabel = '生成分享图',
  onGenerated,
}: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const visitedCities = useUserStore((state) => state.visitedCities)

  const cityMap = useMemo(() => new Map(allCities.map((city) => [city.id, city])), [])

  const stats = useMemo(() => {
    const visited = visitedCityIds.map((id) => cityMap.get(id)).filter((city): city is SchengenCity => Boolean(city))
    const countryCount = new Set(visited.map((city) => city.countryCode)).size

    const latestVisit = [...visitedCities]
      .filter((item) => item.visitDate)
      .sort((a, b) => String(b.visitDate).localeCompare(String(a.visitDate)))[0]

    const latestCity = latestVisit ? cityMap.get(latestVisit.cityId) : undefined
    const topNote = visitedCities.find((item) => item.comment)?.comment ?? '下一站，继续点亮新的城市。'

    return {
      countryCount,
      cityCount: visited.length,
      latest: latestCity ? `${latestCity.flag} ${latestCity.nameZh}` : '尚未记录',
      note: topNote,
    }
  }, [cityMap, visitedCities, visitedCityIds])

  const generateCard = async () => {
    if (!cardRef.current) return
    const dataUrl = await toPng(cardRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      canvasWidth: 1080,
      canvasHeight: 1350,
    })

    const link = document.createElement('a')
    link.download = 'my-schengen-footprint.png'
    link.href = dataUrl
    link.click()
    onGenerated?.()
  }

  return (
    <div className="space-y-4 rounded-2xl border border-muted/60 bg-white p-4 dark:bg-dark-card">
      {showButton ? (
        <button className="rounded-full bg-primary px-4 py-2 text-sm text-white" onClick={generateCard}>
          {triggerLabel}
        </button>
      ) : null}

      <div className="origin-top-left scale-[0.28]">
        <div
          ref={cardRef}
          className="h-[1350px] w-[1080px] rounded-[48px] bg-gradient-to-b from-background to-warm p-16"
        >
          <h2 className="font-title text-6xl text-slate-700">我的申根足迹</h2>
          <p className="mt-3 text-2xl text-slate-500">My Schengen Travel Story</p>

          <div className="mt-10 grid grid-cols-3 gap-6">
            <div className="rounded-3xl bg-white/85 p-6">
              <p className="text-lg text-slate-500">已去国家</p>
              <p className="text-5xl font-semibold text-primary">{stats.countryCount}</p>
            </div>
            <div className="rounded-3xl bg-white/85 p-6">
              <p className="text-lg text-slate-500">已去城市</p>
              <p className="text-5xl font-semibold text-secondary">{stats.cityCount}</p>
            </div>
            <div className="rounded-3xl bg-white/85 p-6">
              <p className="text-lg text-slate-500">最近一次旅行</p>
              <p className="mt-2 text-3xl font-semibold text-purple">{stats.latest}</p>
            </div>
          </div>

          <div className="mt-10 rounded-3xl bg-white/80 p-6">
            <p className="mb-4 text-xl text-slate-600">迷你地图缩略图</p>
            <div className="grid grid-cols-9 gap-3">
              {allCities.slice(0, 45).map((city) => {
                const visited = visitedCityIds.includes(city.id)
                return (
                  <div
                    key={city.id}
                    className={`h-14 rounded-xl text-center text-xl leading-[56px] ${visited ? 'bg-primary/70' : 'bg-muted/30'}`}
                  >
                    {city.flag}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-10 rounded-3xl bg-white/85 p-8">
            <p className="text-xl text-slate-500">精选备注</p>
            <p className="mt-4 text-3xl text-slate-700">“{stats.note.slice(0, 120)}”</p>
          </div>
        </div>
      </div>
    </div>
  )
}
