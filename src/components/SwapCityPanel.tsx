import type { AlternativeCityCandidate } from '../hooks/useSmartRecommend'

interface SwapCityPanelProps {
  cityName: string
  candidates: AlternativeCityCandidate[]
  onSwap: (cityId: string) => void
  onRefresh: () => void
  onClose: () => void
}

export default function SwapCityPanel({ cityName, candidates, onSwap, onRefresh, onClose }: SwapCityPanelProps) {
  return (
    <div className="rounded-xl border border-purple/30 bg-purple/5 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">替换 {cityName}</p>
        <button className="text-xs text-slate-500" onClick={onClose}>关闭</button>
      </div>
      <div className="mt-2 space-y-2">
        {candidates.slice(0, 5).map((item) => (
          <button
            key={item.city.id}
            className="w-full rounded-lg border border-muted/50 bg-white px-3 py-2 text-left text-xs hover:border-purple/50 dark:bg-dark-card"
            onClick={() => onSwap(item.city.id)}
          >
            <p className="text-sm font-medium">{item.city.flag} {item.city.nameZh}</p>
            <p className="mt-1 text-slate-500">{item.reason}</p>
            <p className="mt-1 text-slate-500">
              与前站约 {item.prevTransitHours ? `${item.prevTransitHours.toFixed(1)}h` : '—'} · 与后站约 {item.nextTransitHours ? `${item.nextTransitHours.toFixed(1)}h` : '—'}
            </p>
          </button>
        ))}
        {!candidates.length ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">暂无同区域可替代城市</p> : null}
      </div>
      <div className="mt-2 flex gap-2">
        <button className="rounded-full bg-muted/40 px-3 py-1 text-xs" onClick={onRefresh}>再换一批</button>
      </div>
    </div>
  )
}
