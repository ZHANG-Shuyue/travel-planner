import citiesData from '../data/schengen-cities.json'
import InspirationLinks from '../components/InspirationLinks'
import type { SchengenCity } from '../types/city'

const cities = citiesData as SchengenCity[]

export default function Inspiration() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {cities.slice(0, 8).map((city) => (
        <div key={city.id} className="rounded-xl border border-muted/60 bg-white p-4 dark:bg-dark-card">
          <p className="font-medium">
            {city.flag} {city.nameZh}
          </p>
          <p className="mb-2 text-xs text-slate-500">{city.highlights[0]}</p>
          <InspirationLinks name={city.name} nameZh={city.nameZh} />
        </div>
      ))}
    </div>
  )
}
