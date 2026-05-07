import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { SchengenCity } from '../types/city'

interface SpinWheelProps {
  cities: SchengenCity[]
  unvisitedCityIds: string[]
  onPlanFromCity?: (cityId: string) => void
  onWinnerChange?: (city: SchengenCity | null) => void
  showInternalButton?: boolean
  showInternalResult?: boolean
  spinSignal?: number
}

const palette = ['#A4B9A8', '#7B9EAE', '#D4A9A8', '#C8C2BC', '#E8DFC4', '#9B8EA8']

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const startX = cx + r * Math.cos(start)
  const startY = cy + r * Math.sin(start)
  const endX = cx + r * Math.cos(end)
  const endY = cy + r * Math.sin(end)
  const largeArc = end - start > Math.PI ? 1 : 0
  return `M ${cx} ${cy} L ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY} Z`
}

export default function SpinWheel({
  cities,
  unvisitedCityIds,
  onPlanFromCity,
  onWinnerChange,
  showInternalButton = true,
  showInternalResult = true,
  spinSignal,
}: SpinWheelProps) {
  const [rotation, setRotation] = useState(0)
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null)
  const [spinning, setSpinning] = useState(false)

  const pool = useMemo(() => {
    const cityMap = new Map(cities.map((city) => [city.id, city]))
    return [...unvisitedCityIds]
      .sort(() => Math.random() - 0.5)
      .slice(0, 12)
      .map((id) => cityMap.get(id))
      .filter((city): city is SchengenCity => Boolean(city))
  }, [cities, unvisitedCityIds])

  const spin = () => {
    if (!pool.length || spinning) return
    const targetIndex = Math.floor(Math.random() * pool.length)
    const segAngle = 360 / pool.length
    const targetAngle = 360 - (targetIndex * segAngle + segAngle / 2)
    const extra = 360 * (3 + Math.floor(Math.random() * 3))

    setSpinning(true)
    setWinnerIndex(null)
    setRotation((prev) => prev + extra + targetAngle)

    window.setTimeout(() => {
      setWinnerIndex(targetIndex)
      const city = pool[targetIndex] ?? null
      onWinnerChange?.(city)
      setSpinning(false)
    }, 2300)
  }

  useEffect(() => {
    if (spinSignal !== undefined) spin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinSignal])

  if (!pool.length) {
    return <div className="rounded-xl bg-white p-4 text-sm">未找到可抽取城市，继续添加心愿单吧。</div>
  }

  const winner = winnerIndex !== null ? pool[winnerIndex] : null

  return (
    <div className="space-y-4 rounded-2xl border border-muted/60 bg-white p-4 dark:bg-dark-card">
      <div className="relative mx-auto h-72 w-72 md:h-80 md:w-80">
        <div className="absolute left-1/2 top-0 z-20 h-0 w-0 -translate-x-1/2 border-l-[12px] border-r-[12px] border-t-[18px] border-l-transparent border-r-transparent border-t-purple" />

        <motion.svg
          viewBox="0 0 320 320"
          className="h-full w-full"
          animate={{ rotate: rotation }}
          transition={{ duration: 2.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: '50% 50%' }}
        >
          {pool.map((city, index) => {
            const start = (index / pool.length) * Math.PI * 2 - Math.PI / 2
            const end = ((index + 1) / pool.length) * Math.PI * 2 - Math.PI / 2
            const textAngle = (start + end) / 2
            const tx = 160 + 108 * Math.cos(textAngle)
            const ty = 160 + 108 * Math.sin(textAngle)
            const selected = winnerIndex === index

            return (
              <g key={city.id}>
                <path
                  d={arcPath(160, 160, 150, start, end)}
                  fill={palette[index % palette.length]}
                  opacity={selected ? 1 : 0.9}
                  stroke="#fff"
                  strokeWidth={1}
                />
                <text
                  x={tx}
                  y={ty}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={selected ? 14 : 12}
                  fill="#2c2c2c"
                  transform={`rotate(${(textAngle * 180) / Math.PI + 90} ${tx} ${ty})`}
                >
                  {city.flag} {city.nameZh}
                </text>
              </g>
            )
          })}
          <circle cx="160" cy="160" r="30" fill="#F5F2EE" stroke="#C8C2BC" />
        </motion.svg>
      </div>

      {showInternalButton ? (
        <div className="flex justify-center">
          <button
            onClick={spin}
            className="rounded-full bg-purple px-5 py-2 text-sm text-white transition hover:opacity-90"
          >
            转一转
          </button>
        </div>
      ) : null}

      {showInternalResult && winner ? (
        <div className="rounded-xl border border-purple/40 bg-purple/10 p-3 text-sm">
          <p className="font-medium">🎉 灵感城市：{winner.flag} {winner.nameZh}</p>
          <p className="mt-1 text-slate-600 dark:text-slate-200">{winner.highlights[0]}</p>
          <div className="mt-3 flex gap-2">
            <button
              className="rounded-full bg-primary px-4 py-1.5 text-xs text-white"
              onClick={() => onPlanFromCity?.(winner.id)}
            >
              以此开始规划
            </button>
            <button className="rounded-full bg-white px-4 py-1.5 text-xs" onClick={spin}>
              不喜欢再转一次
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
