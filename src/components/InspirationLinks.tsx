interface InspirationLinksProps {
  nameZh: string
  name: string
  country?: string
}

const buttonClass =
  'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition hover:opacity-90'

export default function InspirationLinks({ nameZh, name, country }: InspirationLinksProps) {
  const xiaohongshu = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(`${nameZh}旅行攻略`)}`
  const google = `https://www.google.com/search?q=${encodeURIComponent(`${name}+travel+guide+2026`)}`
  const tripAdvisor = `https://www.tripadvisor.com/Search?q=${encodeURIComponent(name)}`
  const airbnb = country ? `https://www.airbnb.com/s/${encodeURIComponent(`${name}--${country}`)}/homes` : null

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <a
          className={`${buttonClass} bg-accent/70 text-slate-700`}
          href={xiaohongshu}
          target="_blank"
          rel="noreferrer"
        >
          📕 小红书
        </a>
        <a
          className={`${buttonClass} bg-primary/70 text-white`}
          href={google}
          target="_blank"
          rel="noreferrer"
        >
          🔎 Google
        </a>
        <a
          className={`${buttonClass} bg-secondary/80 text-slate-700`}
          href={tripAdvisor}
          target="_blank"
          rel="noreferrer"
        >
          🧭 TripAdvisor
        </a>
        {airbnb ? (
          <a
            className={`${buttonClass} bg-purple/20 text-purple`}
            href={airbnb}
            target="_blank"
            rel="noreferrer"
          >
            🏠 Airbnb
          </a>
        ) : null}
      </div>
      <p className="text-xs text-slate-500">参考真实游记，规划更靠谱</p>
    </div>
  )
}
