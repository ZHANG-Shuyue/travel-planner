import { useMemo } from 'react'
import citiesData from '../data/schengen-cities.json'
import ProgressBar from '../components/ProgressBar'
import SpinWheel from '../components/SpinWheel'
import { useUserStore } from '../stores/useUserStore'
import type { SchengenCity } from '../types/city'

const cities = citiesData as SchengenCity[]

export default function Home() {
  const visitedCities = useUserStore((state) => state.visitedCities)
  const visitedCityIds = visitedCities.map((item) => item.cityId)

  const visitedCountries = useMemo(() => {
    const set = new Set(
      visitedCityIds
        .map((cityId) => cities.find((city) => city.id === cityId)?.countryCode)
        .filter((code): code is string => Boolean(code)),
    )
    return set.size
  }, [visitedCityIds])

  return (
    <div className="space-y-4">
      <ProgressBar
        visitedCountries={visitedCountries}
        visitedCities={visitedCityIds.length}
        totalCities={cities.length}
      />
      <SpinWheel cities={cities} unvisitedCityIds={cities.filter((city) => !visitedCityIds.includes(city.id)).map((city) => city.id)} />
    </div>
  )
}
