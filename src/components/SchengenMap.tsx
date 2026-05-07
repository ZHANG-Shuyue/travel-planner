import { useMemo } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import citiesData from '../data/schengen-cities.json'
import countryInfoData from '../data/country-info.json'
import { useUserStore } from '../stores/useUserStore'
import type { SchengenCity } from '../types/city'
import type { CountryInfoMap } from '../types/country-info'
import type { CustomCity } from '../types/user'
import CityMarker from './CityMarker'
import RoutePolyline from './RoutePolyline'

interface SchengenMapProps {
  visitedCityIds: string[]
  highlightedCityIds?: string[]
  routePath?: string[]
  wishlistCityIds?: string[]
  onCityClick?: (cityId: string) => void
  onCountryClick?: (countryCode: string) => void
  interactive?: boolean
  compact?: boolean
}

const EUROPE_GEO_URL = 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson'
const countryInfo = countryInfoData as CountryInfoMap

const SCHENGEN_COUNTRY_CODES = new Set(['AT','BE','CH','CZ','DE','DK','EE','ES','FI','FR','GR','HR','HU','IS','IT','LI','LT','LU','LV','MT','NL','NO','PL','PT','SE','SI','SK'])

const NAME_TO_CODE: Record<string, string> = {
  Austria: 'AT', Belgium: 'BE', Switzerland: 'CH', Czechia: 'CZ', 'Czech Republic': 'CZ', Germany: 'DE', Denmark: 'DK', Estonia: 'EE', Spain: 'ES', Finland: 'FI', France: 'FR', Greece: 'GR', Croatia: 'HR', Hungary: 'HU', Iceland: 'IS', Italy: 'IT', Liechtenstein: 'LI', Lithuania: 'LT', Luxembourg: 'LU', Latvia: 'LV', Malta: 'MT', Netherlands: 'NL', Norway: 'NO', Poland: 'PL', Portugal: 'PT', Sweden: 'SE', Slovenia: 'SI', Slovakia: 'SK',
}

const cities = citiesData as SchengenCity[]

export default function SchengenMap({
  visitedCityIds,
  highlightedCityIds = [],
  routePath = [],
  wishlistCityIds = [],
  onCityClick,
  onCountryClick,
  interactive = true,
  compact = false,
}: SchengenMapProps) {
  const visitedCities = useUserStore((state) => state.visitedCities)
  const customCities = useUserStore((state) => state.customCities)

  const visitedSet = new Set(visitedCityIds)
  const highlightedSet = new Set(highlightedCityIds)
  const wishlistSet = new Set(wishlistCityIds)

  const cityMap = useMemo(() => new Map(cities.map((city) => [city.id, city])), [])

  const cityMeta = useMemo(
    () =>
      visitedCities.reduce<{ notes: Record<string, string>; ratings: Record<string, number> }>(
        (acc, city) => {
          if (city.comment) acc.notes[city.cityId] = city.comment
          if (city.rating) acc.ratings[city.cityId] = city.rating
          return acc
        },
        { notes: {}, ratings: {} },
      ),
    [visitedCities],
  )

  const customCityMap = useMemo(() => new Map(customCities.map((city: CustomCity) => [city.id, city])), [customCities])

  const visitedCountryCityCount = useMemo(() => {
    const counter: Record<string, number> = {}
    for (const visited of visitedCities) {
      const preset = cityMap.get(visited.cityId)
      const custom = customCityMap.get(visited.cityId)
      const code = preset?.countryCode ?? custom?.countryCode
      if (code) counter[code] = (counter[code] ?? 0) + 1
    }
    return counter
  }, [cityMap, customCityMap, visitedCities])

  const totalCountryCityCount = useMemo(() => {
    const counter: Record<string, number> = {}
    for (const city of cities) counter[city.countryCode] = (counter[city.countryCode] ?? 0) + 1
    for (const city of customCities) counter[city.countryCode] = (counter[city.countryCode] ?? 0) + 1
    return counter
  }, [customCities])

  const visitedCountryDurations = useMemo(() => {
    const counter: Record<string, number> = {}
    for (const cityId of routePath) {
      const countryCode = cityMap.get(cityId)?.countryCode
      if (!countryCode) continue
      counter[countryCode] = (counter[countryCode] ?? 0) + 1
    }
    return counter
  }, [routePath, cityMap])

  const routeCountryCodes = useMemo(() => {
    const result = new Set<string>()
    for (const cityId of routePath) {
      const code = cityMap.get(cityId)?.countryCode
      if (code) result.add(code)
    }
    return result
  }, [routePath, cityMap])

  const wishlistCountryCodes = useMemo(() => {
    const result = new Set<string>()
    for (const cityId of wishlistCityIds) {
      const code = cityMap.get(cityId)?.countryCode
      if (code) result.add(code)
    }
    return result
  }, [wishlistCityIds, cityMap])

  return (
    <div className={`map-root rounded-2xl border border-muted/60 bg-background p-2 shadow-sm ${compact ? 'h-[200px] md:h-[300px]' : ''}`}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: [12, 53], scale: compact ? 420 : 520 }}
        width={980}
        height={compact ? 300 : 640}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <defs>
          <filter id="rough"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" result="noise" /><feDisplacementMap in="SourceGraphic" in2="noise" scale="0.2" /></filter>
        </defs>

        <Geographies geography={EUROPE_GEO_URL}>
          {({ geographies, projection }: { geographies: any[]; projection: (coordinates: [number, number]) => [number, number] | null }) => (
            <>
              {geographies.map((geo: any) => {
                const geoName = String((geo.properties as { name?: string })?.name ?? '')
                const countryCode = NAME_TO_CODE[geoName]
                const isSchengen = Boolean(countryCode && SCHENGEN_COUNTRY_CODES.has(countryCode))
                const hasVisited = Boolean(countryCode && (visitedCountryCityCount[countryCode] ?? 0) > 0)

                const visitDepth = countryCode ? visitedCountryDurations[countryCode] ?? 0 : 0
                const visitedOpacity = Math.min(0.45 + visitDepth * 0.12, 0.9)
                const isRouteCountry = countryCode ? routeCountryCodes.has(countryCode) : false
                const hasWishlist = countryCode ? wishlistCountryCodes.has(countryCode) : false

                const fill = !isSchengen
                  ? '#F0EDE8'
                  : hasVisited
                    ? `rgba(164, 185, 168, ${visitedOpacity})`
                    : isRouteCountry
                      ? 'rgba(123, 158, 174, 0.34)'
                      : '#E8E4E0'

                const tooltip = countryCode
                  ? `${countryInfo[countryCode]?.flag ?? ''} ${countryInfo[countryCode]?.nameZh ?? geoName} · ${hasVisited ? `已探索 ${visitedCountryCityCount[countryCode] ?? 0}/${totalCountryCityCount[countryCode] ?? 0} 城` : '点击了解更多'}`
                  : geoName

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke={hasWishlist ? '#9B8EA8' : 'var(--map-border-color)'}
                    strokeWidth={hasWishlist ? 1.5 : 1}
                    className="map-country"
                    style={{
                      default: { outline: 'none', strokeDasharray: hasWishlist ? '5 3' : '4 2', pointerEvents: interactive && isSchengen ? 'auto' : 'none', cursor: interactive && isSchengen ? 'pointer' : 'default' },
                      hover: { outline: 'none', filter: 'brightness(1.1)' },
                      pressed: { outline: 'none' },
                    }}
                    onClick={() => {
                      if (interactive && isSchengen && countryCode) onCountryClick?.(countryCode)
                    }}
                  >
                    <title>{tooltip}</title>
                  </Geography>
                )
              })}

              <RoutePolyline routePath={routePath} cities={cities} projection={projection} />

              {cities.map((city) => (
                <CityMarker
                  key={city.id}
                  city={city}
                  note={cityMeta.notes[city.id]}
                  rating={cityMeta.ratings[city.id]}
                  isVisited={visitedSet.has(city.id)}
                  isHighlighted={highlightedSet.has(city.id)}
                  isInWishlist={wishlistSet.has(city.id)}
                  onCityClick={interactive ? onCityClick : undefined}
                />
              ))}
            </>
          )}
        </Geographies>
      </ComposableMap>
    </div>
  )
}
