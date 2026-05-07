import { useMemo, useState } from 'react'
import cityDetailsData from '../data/city-details.json'
import type { SchengenCity, TransitMethod } from '../types/city'
import type { CityDetail } from '../types/city-details'
import { getTransitOptions } from '../utils/transit'

interface TransitCardProps {
  fromCity: SchengenCity
  toCity: SchengenCity
  cityMap: Map<string, SchengenCity>
  onInsertStation?: () => void
}

const ICON: Record<string, string> = { train: '🚄', flight: '✈️', bus: '🚌', car: '🚗', ferry: '⛴️' }

const detailsMap = new Map((cityDetailsData as CityDetail[]).map((item) => [item.id, item]))

function prettyMethod(method: TransitMethod) {
  if (method.name) return method.name
  if (method.type === 'train') return '火车'
  if (method.type === 'flight') return '飞机'
  if (method.type === 'bus') return '大巴'
  return '交通'
}

export default function TransitCard({ fromCity, toCity, cityMap, onInsertStation }: TransitCardProps) {
  const [expanded, setExpanded] = useState(false)
  const transit = useMemo(() => getTransitOptions(fromCity.id, toCity.id, cityMap), [fromCity.id, toCity.id, cityMap])

  const recommended = transit.recommended
  const others = transit.methods.filter((m) => m !== recommended)

  const fromDetail = detailsMap.get(fromCity.id)
  const toDetail = detailsMap.get(toCity.id)
  const originCode = fromDetail?.nearestAirportCode ?? fromCity.countryCode
  const destinationCode = toDetail?.nearestAirportCode ?? toCity.countryCode

  const trainlineUrl = `https://www.thetrainline.com/book/results?origin=${encodeURIComponent(fromCity.name)}&destination=${encodeURIComponent(toCity.name)}`
  const skyscannerUrl = `https://www.skyscanner.net/transport/flights/${originCode.toLowerCase()}/${destinationCode.toLowerCase()}/`
  const flixbusUrl = `https://www.flixbus.com/bus-routes/${encodeURIComponent(fromCity.name.toLowerCase())}-to-${encodeURIComponent(toCity.name.toLowerCase())}`

  return (
    <div className="relative ml-2 rounded-xl border border-warm/70 bg-warm/80 px-4 py-3 text-sm dark:bg-[#574f38]">
      <div className="absolute -left-2 top-0 h-full w-[2px] rounded bg-muted" />

      <p className="font-medium">
        {fromCity.flag} {fromCity.nameZh} → {toCity.flag} {toCity.nameZh}
      </p>

      <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
        <span>{ICON[recommended.type] ?? '🚄'}</span>
        <span className="font-medium">{prettyMethod(recommended)}</span>
        <span>约 {recommended.duration}</span>
        <span>{recommended.costRange ?? `€${Math.max(10, recommended.estimatedCost - 30)}-€${recommended.estimatedCost + 50}`}</span>
      </div>

      {others.length ? (
        <div className="mt-2">
          <button className="text-xs text-slate-600 underline dark:text-slate-200" onClick={() => setExpanded((v) => !v)}>
            {expanded ? '收起其他选项' : '其他选项'}
          </button>
          {expanded ? (
            <div className="mt-1 space-y-1 text-xs">
              {others.map((method, idx) => (
                <div key={`${method.type}-${idx}`} className="flex items-center gap-2">
                  <span>{ICON[method.type] ?? '🚄'}</span>
                  <span>{prettyMethod(method)}</span>
                  <span>{method.duration}</span>
                  <span>{method.costRange ?? `€${method.estimatedCost}`}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-200">
        实际价格因预订时间和季节浮动，建议提前预订
      </p>
      {transit.estimated ? (
        <p className="text-[11px] text-slate-600 dark:text-slate-200">
          距离约 {Math.round(transit.distanceKm ?? 0)} km，以上为估算，建议搜索具体班次
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-2">
        {onInsertStation ? (
          <button className="no-pdf-hide rounded-full bg-purple/15 px-3 py-1 text-xs text-purple" onClick={onInsertStation}>
            + 插入一站
          </button>
        ) : null}
        <a className="rounded-full bg-secondary/80 px-3 py-1 text-xs" target="_blank" rel="noreferrer" href={trainlineUrl}>查火车</a>
        <a className="rounded-full bg-secondary/80 px-3 py-1 text-xs" target="_blank" rel="noreferrer" href={skyscannerUrl}>查机票</a>
        <a className="rounded-full bg-secondary/80 px-3 py-1 text-xs" target="_blank" rel="noreferrer" href={flixbusUrl}>查大巴</a>
      </div>
    </div>
  )
}
