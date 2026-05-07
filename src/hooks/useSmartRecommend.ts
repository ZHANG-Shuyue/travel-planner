import { useMemo } from 'react'
import citiesData from '../data/schengen-cities.json'
import transitMatrixData from '../data/transit-matrix.json'
import { useUserStore } from '../stores/useUserStore'
import type { OptimizedLeg } from './useRouteOptimize'
import { getTransitOptions, haversine } from '../utils/transit'
import type { SchengenCity, TransitMethod, TransitRoute } from '../types/city'
import type { BudgetEstimate, DayPlan, RouteStop, TravelPlan, TravelStyle } from '../types/plan'

export type PreferenceTag = '文化' | '美食' | '自然' | '海滨' | '城市探索' | '小众冒险'

export interface RecommendParams {
  days: number
  departureCity: string
  preferenceTags: PreferenceTag[]
  budgetLevel: BudgetEstimate['level']
  wishlistPriority: boolean
  travelStyle: TravelStyle
  requiredCityIds?: string[]
  excludedCityIds?: string[]
  excludedCombos?: string[][]
}

export interface SmartRecommendResult {
  plan: TravelPlan
  selectedCities: SchengenCity[]
  routePath: string[]
  legs: OptimizedLeg[]
  summary: string
}

export interface AlternativeCityCandidate {
  city: SchengenCity
  prevTransitHours?: number
  nextTransitHours?: number
  reason: string
}

interface RefineOptions {
  departureCity: string
  travelStyle: TravelStyle
  budgetLevel: BudgetEstimate['level']
  preferenceTags: PreferenceTag[]
  fillConnections: boolean
  keepOrder: boolean
}

const allCities = citiesData as SchengenCity[]
const transitMatrix = transitMatrixData as TransitRoute[]
const HOT_CITY_IDS = new Set(['paris', 'rome', 'barcelona', 'amsterdam', 'vienna', 'prague', 'lisbon', 'berlin'])
const transitRouteMap = new Map(transitMatrix.map((route) => [[route.from, route.to].sort().join('__'), route]))
const DEPARTURE_CITIES: Record<string, { id: string; name: string; nameZh: string; countryCode: string; lat: number; lng: number; isDepartureOnly: true }> = {
  london: {
    id: 'london',
    name: 'London',
    nameZh: '伦敦',
    countryCode: 'GB',
    lat: 51.5074,
    lng: -0.1278,
    isDepartureOnly: true,
  },
}

const COUNTRY_REGION: Record<string, string> = {
  FR: 'france',
  BE: 'western-core',
  NL: 'western-core',
  LU: 'western-core',
  DE: 'germanic',
  AT: 'germanic',
  CH: 'germanic',
  LI: 'germanic',
  IT: 'italy',
  ES: 'iberia',
  PT: 'iberia',
  NO: 'nordic',
  SE: 'nordic',
  DK: 'nordic',
  FI: 'nordic',
  IS: 'nordic',
  PL: 'cee',
  CZ: 'cee',
  SK: 'cee',
  HU: 'cee',
  SI: 'balkan',
  HR: 'balkan',
  GR: 'balkan',
  EE: 'baltic',
  LV: 'baltic',
  LT: 'baltic',
  MT: 'balkan',
}

const ADJACENT_REGIONS: Record<string, string[]> = {
  'western-core': ['france', 'germanic'],
  france: ['western-core', 'iberia', 'germanic', 'italy'],
  germanic: ['western-core', 'france', 'italy', 'cee'],
  italy: ['france', 'germanic', 'balkan'],
  iberia: ['france'],
  nordic: ['western-core', 'germanic', 'baltic'],
  cee: ['germanic', 'balkan', 'baltic'],
  balkan: ['cee', 'italy'],
  baltic: ['cee', 'nordic'],
}

const STYLE_META: Record<TravelStyle, { coefficient: number; minStay: number; maxStay: number; label: string }> = {
  speedrun: { coefficient: 1.8, minStay: 1, maxStay: 1.5, label: '⚡ 特种兵模式' },
  balanced: { coefficient: 1, minStay: 2, maxStay: 3, label: '🎒 经典游' },
  relaxed: { coefficient: 0.5, minStay: 3, maxStay: 5, label: '🏖️ 度假游' },
  deep: { coefficient: 0.3, minStay: 4, maxStay: 7, label: '🔍 深度游' },
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function targetCityRange(days: number) {
  if (days <= 3) return [1, 1] as const
  if (days <= 7) return [2, 3] as const
  if (days <= 14) return [3, 5] as const
  if (days <= 21) return [5, 7] as const
  return [7, 10] as const
}

function pickBaseCityCount(days: number, maxAvailable: number) {
  const [min, max] = targetCityRange(days)
  const upper = Math.min(max, maxAvailable)
  const lower = Math.min(min, upper)
  return lower + Math.floor(Math.random() * (upper - lower + 1))
}

function adjustCountByStyle(days: number, count: number, maxAvailable: number, style: TravelStyle, requiredCount: number) {
  let next = clamp(count, requiredCount || 1, maxAvailable)

  if (style === 'speedrun') {
    while (days / next > 1.5 && next < maxAvailable) next += 1
  }
  if (style === 'relaxed') {
    while (days / next < 3 && next > Math.max(1, requiredCount)) next -= 1
  }
  if (style === 'deep') {
    while (days / next < 4 && next > Math.max(1, requiredCount)) next -= 1
  }

  return clamp(next, Math.max(1, requiredCount), maxAvailable)
}

function scoreByPreferences(city: SchengenCity, tags: PreferenceTag[]) {
  if (!tags.length) return 15
  const text = `${city.vibes.join(' ')} ${city.highlights.join(' ')}`.toLowerCase()
  const dictionary: Record<PreferenceTag, string[]> = {
    文化: ['历史', '博物馆', '教堂', '古城', 'museum'],
    美食: ['美食', '餐厅', '市场', 'food', 'wine'],
    自然: ['自然', '山', '湖', '徒步', 'fjord', 'hiking'],
    海滨: ['海', '海岸', 'beach', 'coast', 'island'],
    城市探索: ['都市', '夜生活', '设计', 'shopping', 'city'],
    小众冒险: ['小众', '冒险', '户外', 'trail', 'adventure'],
  }
  const matched = tags.reduce((count, tag) => count + (dictionary[tag].some((k) => text.includes(k)) ? 1 : 0), 0)
  return clamp((matched / tags.length) * 30, 0, 30)
}

function scoreStyleBonus(city: SchengenCity, style: TravelStyle) {
  const vibes = city.vibes.join(' ')
  if (style === 'speedrun') return (HOT_CITY_IDS.has(city.id) ? 8 : 0) + (city.avgDaysRecommended <= 2 ? 5 : 0)
  if (style === 'relaxed') return (vibes.includes('海') || vibes.includes('自然') ? 8 : 0) + (city.avgDaysRecommended >= 3 ? 4 : 0)
  if (style === 'deep') return Math.min(10, city.highlights.length * 2) + (city.avgDaysRecommended >= 3 ? 5 : 0)
  return 3
}

function scoreBySeason(city: SchengenCity, month: number) {
  return city.bestMonths.includes(month) ? 20 : 8
}

function scoreByGeography(city: SchengenCity, departure?: SchengenCity, selected: SchengenCity[] = [], style: TravelStyle = 'balanced') {
  const departureScore = departure
    ? clamp(25 - Math.abs(haversine(city.lat, city.lng, departure.lat, departure.lng) - 650) / 55, 6, 16)
    : 12

  if (!selected.length) return departureScore

  const avgDistance =
    selected.reduce((sum, item) => sum + haversine(city.lat, city.lng, item.lat, item.lng), 0) / selected.length
  const target = style === 'speedrun' ? 350 : style === 'relaxed' ? 700 : 500
  const clusterScore = clamp(16 - Math.abs(avgDistance - target) / 45, 4, 12)
  return clamp(departureScore + clusterScore, 0, 25)
}

function getMaxLegHours(days: number) {
  if (days <= 3) return 1.5
  if (days <= 7) return 3
  if (days <= 14) return 5
  return Number.POSITIVE_INFINITY
}

function parseDurationFlexible(duration: string) {
  const hourMatches = [...duration.toLowerCase().matchAll(/(\d+(?:\.\d+)?)h/g)].map((item) => Number(item[1]))
  const minuteMatches = [...duration.toLowerCase().matchAll(/(\d+)\s*m/g)].map((item) => Number(item[1]))
  const hours = hourMatches.length ? Math.min(...hourMatches) : 0
  const mins = minuteMatches.length ? Math.min(...minuteMatches) : 0
  return hours + mins / 60
}

function pairTransitHours(from: SchengenCity, to: SchengenCity) {
  const route = transitRouteMap.get([from.id, to.id].sort().join('__'))
  if (!route?.methods.length) return haversine(from.lat, from.lng, to.lat, to.lng) / 150
  const options = route.methods.map((item) => parseDurationFlexible(item.duration)).filter((item) => item > 0)
  if (!options.length) return haversine(from.lat, from.lng, to.lat, to.lng) / 150
  return Math.min(...options)
}

function distanceScoreByHours(hours: number) {
  if (hours <= 0.6) return 100
  if (hours <= 1) return 85
  if (hours <= 2) return 70
  if (hours <= 3) return 55
  if (hours <= 5) return 40
  return 20
}

function resolveDeparturePoint(departureCityId: string, cityMap: Map<string, SchengenCity>) {
  const preset = cityMap.get(departureCityId)
  if (preset) {
    return {
      id: preset.id,
      countryCode: preset.countryCode,
      lat: preset.lat,
      lng: preset.lng,
      region: COUNTRY_REGION[preset.countryCode],
    }
  }
  const external = DEPARTURE_CITIES[departureCityId]
  if (external) {
    return {
      id: external.id,
      countryCode: external.countryCode,
      lat: external.lat,
      lng: external.lng,
      region: 'western-core',
    }
  }
  return {
    id: 'london',
    countryCode: 'GB',
    lat: 51.5074,
    lng: -0.1278,
    region: 'western-core',
  }
}

function scorePopularity(city: SchengenCity, style: TravelStyle) {
  if (style === 'speedrun') return HOT_CITY_IDS.has(city.id) ? 10 : 4
  if (style === 'deep') return HOT_CITY_IDS.has(city.id) ? 5 : 9
  return HOT_CITY_IDS.has(city.id) ? 6 : 8
}

function chooseMethodByStyle(methods: TransitMethod[], style: TravelStyle) {
  const sortedByDuration = [...methods].sort((a, b) => durationHours(a.duration) - durationHours(b.duration))
  if (style === 'speedrun') return sortedByDuration[0]

  const recommended = methods.find((m) => m.recommended)
  if (style === 'balanced' || style === 'deep') return recommended ?? sortedByDuration[0]

  const comfortRank = (m: TransitMethod) => (m.type === 'train' ? 3 : m.type === 'flight' ? 2 : m.type === 'bus' ? 1 : 0)
  return [...methods].sort((a, b) => comfortRank(b) - comfortRank(a))[0]
}

function durationHours(duration: string) {
  const m = duration.match(/(\d+(?:\.\d+)?)h/)
  const mm = duration.match(/(\d+)\s*m/)
  return (m ? Number(m[1]) : 0) + (mm ? Number(mm[1]) / 60 : 0)
}

function allocateDaysByStyle(totalDays: number, cityCount: number, style: TravelStyle) {
  const { minStay, maxStay } = STYLE_META[style]
  const assigned = new Array(cityCount).fill(clamp(totalDays / cityCount, minStay, maxStay)).map((n) => Math.round(n))

  const minInt = Math.max(1, Math.floor(minStay))
  const maxInt = Math.max(minInt, Math.ceil(maxStay))

  let sum = assigned.reduce((a, b) => a + b, 0)
  while (sum > totalDays) {
    const idx = assigned.findIndex((v) => v > minInt)
    if (idx < 0) break
    assigned[idx] -= 1
    sum -= 1
  }
  while (sum < totalDays) {
    const idx = assigned.findIndex((v) => v < maxInt)
    if (idx < 0) {
      assigned[assigned.indexOf(Math.min(...assigned))] += 1
    } else {
      assigned[idx] += 1
    }
    sum += 1
  }
  return assigned
}

function buildItinerary(cities: SchengenCity[], daysPerCity: number[], legs: OptimizedLeg[], style: TravelStyle): DayPlan[] {
  const result: DayPlan[] = []
  let day = 1
  const themes = ['博物馆主题日', '街区漫步日', '在地美食日', '城市摄影日', '本地生活体验日']

  cities.forEach((city, cityIndex) => {
    const leg = legs.find((item) => item.to === city.id)
    for (let offset = 0; offset < daysPerCity[cityIndex]; offset += 1) {
      const h1 = city.highlights[offset % city.highlights.length]
      const h2 = city.highlights[(offset + 1) % city.highlights.length]
      const h3 = city.highlights[(offset + 2) % city.highlights.length]
      const h4 = city.highlights[(offset + 3) % city.highlights.length]

      let morning = `${h1}（约2小时）`
      let afternoon = `${h2}（约2小时）`
      let evening = `${h3}（约2小时）`

      if (style === 'speedrun') {
        morning = `${h1}（1.5h）→ ${h2}（1h）`
        afternoon = `${h3}（1.5h）→ ${h4}（1h）`
        evening = `${city.nameZh}夜景点（1h）→ 本地晚餐（1.5h）`
      } else if (style === 'relaxed') {
        morning = `${h1}（1.5h）`
        afternoon = `${h2}（1.5h）`
        evening = `${city.nameZh}散步（1h）→ 晚餐（1.5h）`
      } else if (style === 'deep') {
        const theme = themes[(day - 1) % themes.length]
        morning = `${h1}（2h）→ ${theme}`
        afternoon = `${h2}（2h）`
        evening = `${city.nameZh}街区（1.5h）→ 晚餐（1.5h）`
      } else {
        morning = `${h1}（1.5h）→ ${h2}（1h）`
        afternoon = `${h3}（2h）`
        evening = `${h4}（1h）→ 晚餐（1.5h）`
      }

      result.push({
        dayNumber: day,
        cityId: city.id,
        morning,
        afternoon,
        evening,
        restaurant: `${city.nameZh}本地特色餐厅（地方菜）`,
        transitNote: offset === 0 && leg ? `${leg.method.name ?? leg.method.type} · ${leg.method.duration}` : undefined,
      })
      day += 1
    }
  })

  return result
}

function comboExists(combos: string[][], cities: SchengenCity[]) {
  const next = [...cities.map((city) => city.id)].sort().join(',')
  return combos.some((combo) => [...combo].sort().join(',') === next)
}

export function useSmartRecommend() {
  const visitedCities = useUserStore((state) => state.visitedCities)
  const customCities = useUserStore((state) => state.customCities)
  const wishlist = useUserStore((state) => state.wishlist)

  const cityMap = useMemo(() => new Map(allCities.map((city) => [city.id, city])), [])

  const unvisitedCities = useMemo(() => {
    const visited = new Set(visitedCities.map((item) => item.cityId))
    const customMap = new Map(customCities.map((city) => [city.id, city]))
    const visitedCountryCodes = new Set<string>()
    visitedCities.forEach((item) => {
      const preset = allCities.find((city) => city.id === item.cityId)
      const custom = customMap.get(item.cityId)
      const code = preset?.countryCode ?? custom?.countryCode
      if (code) visitedCountryCodes.add(code)
    })
    return allCities.filter((city) => !visited.has(city.id) && !visitedCountryCodes.has(city.countryCode))
  }, [customCities, visitedCities])

  const wishlistCities = useMemo(() => {
    const wishlistSet = new Set(wishlist)
    return allCities.filter((city) => wishlistSet.has(city.id))
  }, [wishlist])

  const generateRecommendation = (params: RecommendParams): SmartRecommendResult | null => {
    const {
      days,
      departureCity,
      preferenceTags,
      budgetLevel,
      wishlistPriority,
      travelStyle,
      requiredCityIds = [],
      excludedCityIds = [],
      excludedCombos = [],
    } = params

    const month = new Date().getMonth() + 1
    const exclusion = new Set(excludedCityIds)
    const available =
      unvisitedCities.filter((city) => !exclusion.has(city.id)).length > 0
        ? unvisitedCities.filter((city) => !exclusion.has(city.id))
        : allCities.filter((city) => !exclusion.has(city.id))
    if (!available.length) return null

    const baseCount = pickBaseCityCount(days, available.length)
    const styleAdjusted = Math.round(baseCount * STYLE_META[travelStyle].coefficient)
    const targetCountRaw = adjustCountByStyle(days, clamp(styleAdjusted, 1, available.length), available.length, travelStyle, requiredCityIds.length)
    const targetCount = days <= 3 ? Math.min(2, targetCountRaw) : targetCountRaw

    const departure = cityMap.get(departureCity)
    const departurePoint = resolveDeparturePoint(departureCity, cityMap)
    const wishlistSet = new Set(wishlistCities.map((city) => city.id))
    const departureRegion = departurePoint.region
    const maxLegHours = getMaxLegHours(days)
    const selected: SchengenCity[] = []
    const requiredSet = new Set(requiredCityIds)

    const pool = [...available]
    let currentFrom = departure

    while (selected.length < targetCount && pool.length) {
      const scored = pool
        .map((city) => {
          if (selected.some((item) => item.id === city.id)) return { city, total: 0, legHours: Number.POSITIVE_INFINITY }
          const legHours = currentFrom
            ? pairTransitHours(currentFrom, city)
            : haversine(departurePoint.lat, departurePoint.lng, city.lat, city.lng) / 150
          if (legHours > maxLegHours) return { city, total: 0, legHours }
          if (days <= 3 && selected.length === 1 && legHours > 1) return { city, total: 0, legHours }

          const preferenceScore = scoreByPreferences(city, preferenceTags)
          const seasonScore = scoreBySeason(city, month)
          const geoScore = scoreByGeography(city, departure, selected, travelStyle)
          const wishlistScore = wishlistPriority && wishlistSet.has(city.id) ? 15 : 0
          const styleScore = scoreStyleBonus(city, travelStyle)
          const popularityScore = scorePopularity(city, travelStyle)
          const region = COUNTRY_REGION[city.countryCode]
          const sameRegionBonus = days <= 7 && departureRegion && region === departureRegion ? 20 : 0
          const adjacentRegionBonus = days <= 7 && departureRegion && region !== departureRegion && ADJACENT_REGIONS[departureRegion]?.includes(region) ? 10 : 0
          const requiredBonus = requiredSet.has(city.id) ? 35 : 0
          const shortTripStayBonus = days <= 3 && city.avgDaysRecommended >= 2 ? 18 : 0
          const baseTotal = clamp(preferenceScore + seasonScore + geoScore + wishlistScore + styleScore + popularityScore + sameRegionBonus + adjacentRegionBonus + requiredBonus + shortTripStayBonus, 0, 100)
          const chainDistanceScore = distanceScoreByHours(legHours)
          const total = baseTotal * 0.6 + chainDistanceScore * 0.4 + Math.random() * 2
          return { city, total, legHours }
        })
        .filter((item) => item.total > 0)
        .sort((a, b) => b.total - a.total || a.legHours - b.legHours)

      const picked = scored[0]?.city
      if (!picked) break
      selected.push(picked)
      pool.splice(pool.findIndex((item) => item.id === picked.id), 1)
      currentFrom = picked

      if (days <= 3 && selected.length >= 1) {
        const canAddAnother =
          selected.length < 2 &&
          pool.some((candidate) => pairTransitHours(picked, candidate) <= 1 && candidate.avgDaysRecommended >= 2)
        if (!canAddAnother) break
      }
    }

    requiredCityIds.forEach((id) => {
      if (selected.some((item) => item.id === id)) return
      const requiredCity = available.find((item) => item.id === id)
      if (!requiredCity) return
      const hours = currentFrom
        ? pairTransitHours(currentFrom, requiredCity)
        : haversine(departurePoint.lat, departurePoint.lng, requiredCity.lat, requiredCity.lng) / 150
      if (hours <= maxLegHours) {
        selected.push(requiredCity)
      }
    })

    if (!selected.length) {
      const fallback = [...available]
        .sort((a, b) => {
          const scoreA = scoreByPreferences(a, preferenceTags) + scoreBySeason(a, month)
          const scoreB = scoreByPreferences(b, preferenceTags) + scoreBySeason(b, month)
          return scoreB - scoreA
        })[0]
      if (fallback) selected.push(fallback)
    }
    if (!selected.length) return null
    if (comboExists(excludedCombos, selected) && available.length > selected.length) {
      const alt = available.find((city) => !selected.some((item) => item.id === city.id))
      if (alt) selected[selected.length - 1] = alt
    }

    let routedCities = [...selected]

    const buildStyleLegs = (ordered: SchengenCity[]) =>
      ordered
        .map((to, index) => {
          const from = index === 0 ? departureCity : ordered[index - 1]?.id
          if (!from) return null
          const fromCity = cityMap.get(from)
          const toCity = cityMap.get(to.id)
          const fromLat = fromCity?.lat ?? 51.5074
          const fromLng = fromCity?.lng ?? -0.1278
          if (!toCity) return null
          const transit = getTransitOptions(from, to.id, cityMap)
          const method = chooseMethodByStyle(transit.methods, travelStyle)
          return { from, to: to.id, method, distanceKm: haversine(fromLat, fromLng, toCity.lat, toCity.lng) }
        })
        .filter((leg): leg is OptimizedLeg => Boolean(leg))

    const travelShareLimit = travelStyle === 'speedrun' ? 0.3 : travelStyle === 'relaxed' ? 0.15 : 0.2
    while (routedCities.length > 1) {
      const styleLegsTry = buildStyleLegs(routedCities)
      const transitHours = styleLegsTry.reduce((sum, item) => sum + durationHours(item.method.duration), 0)
      const allowed = days * 10 * travelShareLimit
      if (transitHours <= allowed) break
      const removable = routedCities
        .filter((city) => !requiredSet.has(city.id))
        .map((city) => ({
          city,
          score: haversine(departurePoint.lat, departurePoint.lng, city.lat, city.lng),
        }))
        .sort((a, b) => b.score - a.score)[0]?.city
      if (!removable) break
      routedCities = routedCities.filter((city) => city.id !== removable.id)
    }

    const daysPerCity = allocateDaysByStyle(days, routedCities.length, travelStyle)

    const styleLegs: OptimizedLeg[] = routedCities.map((to, index) => {
      const from = index === 0 ? departureCity : routedCities[index - 1]?.id
      if (!from) return null
      const fromCity = cityMap.get(from)
      const toCity = cityMap.get(to.id)
      const fromLat = fromCity?.lat ?? 51.5074
      const fromLng = fromCity?.lng ?? -0.1278
      if (!toCity) return null
      const transit = getTransitOptions(from, to.id, cityMap)
      const method = chooseMethodByStyle(transit.methods, travelStyle)
      return { from, to: to.id, method, distanceKm: haversine(fromLat, fromLng, toCity.lat, toCity.lng) }
    }).filter((leg): leg is OptimizedLeg => Boolean(leg))

    const route: RouteStop[] = routedCities.map((city, index) => {
      const leg = styleLegs.find((item) => item.to === city.id)
      return {
        cityId: city.id,
        days: daysPerCity[index] ?? 1,
        arrivalMethod: leg?.method.type,
        arrivalDuration: leg?.method.duration,
        arrivalCost: leg?.method.estimatedCost,
      }
    })

    const itinerary = buildItinerary(routedCities, daysPerCity, styleLegs, travelStyle)

    let transitFactor = 1
    if (travelStyle === 'speedrun') transitFactor = 1.3

    const totalTransit = Math.round(styleLegs.reduce((sum, item) => sum + item.method.estimatedCost, 0) * transitFactor)

    const stayCostBase = routedCities.reduce((sum, city, index) => {
      const d = daysPerCity[index] ?? 1
      let daily = city.budgetPerDay[budgetLevel]
      if (travelStyle === 'relaxed') {
        daily = Math.round((city.budgetPerDay[budgetLevel === 'budget' ? 'mid' : budgetLevel] ?? daily) * 1.1)
      }
      return sum + daily * d
    }, 0)

    let accommodationRatio = 0.45
    let foodRatio = 0.25
    if (travelStyle === 'relaxed') {
      accommodationRatio = 0.52
      foodRatio = 0.28
    }

    const accommodation = Math.round(stayCostBase * accommodationRatio)
    const food = Math.round(stayCostBase * foodRatio * (travelStyle === 'relaxed' ? 1.2 : 1))
    const activities = Math.round(stayCostBase * (1 - accommodationRatio - foodRatio))

    const totalBudget: BudgetEstimate = {
      accommodation,
      food,
      transit: totalTransit,
      activities,
      total: accommodation + food + activities + totalTransit,
      perDay: Math.round((accommodation + food + activities + totalTransit) / days),
      level: budgetLevel,
    }

    const plan: TravelPlan = {
      id: `smart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: `${days}天申根灵感路线`,
      createdAt: new Date().toISOString(),
      totalDays: days,
      cities: routedCities.map((city) => city.id),
      route,
      itinerary,
      totalBudget,
      status: 'draft',
      travelStyle,
    }

    const styleText = `${STYLE_META[travelStyle].label} · ${days}天${routedCities.length}城${travelStyle === 'speedrun' ? '暴走之旅' : travelStyle === 'relaxed' ? '慢享之旅' : travelStyle === 'deep' ? '沉浸之旅' : '经典之旅'}`

    return {
      plan,
      selectedCities: routedCities,
      routePath: routedCities.map((city) => city.id),
      legs: styleLegs,
      summary: styleText,
    }
  }

  const buildPlanFromOrderedCities = (
    orderedCities: SchengenCity[],
    totalDays: number,
    travelStyle: TravelStyle,
    budgetLevel: BudgetEstimate['level'],
    departureCity: string,
    sourceMap?: Record<string, 'mandatory' | 'recommended'>,
  ): SmartRecommendResult | null => {
    if (!orderedCities.length) return null
    const daysPerCity = allocateDaysByStyle(totalDays, orderedCities.length, travelStyle)
    const styleLegs: OptimizedLeg[] = orderedCities
      .map((to, index) => {
        const from = index === 0 ? departureCity : orderedCities[index - 1]?.id
        if (!from) return null
        const fromCity = cityMap.get(from)
        const toCity = cityMap.get(to.id)
        const fromLat = fromCity?.lat ?? 51.5074
        const fromLng = fromCity?.lng ?? -0.1278
        if (!toCity) return null
        const transit = getTransitOptions(from, to.id, cityMap)
        const method = chooseMethodByStyle(transit.methods, travelStyle)
        return { from, to: to.id, method, distanceKm: haversine(fromLat, fromLng, toCity.lat, toCity.lng) }
      })
      .filter((leg): leg is OptimizedLeg => Boolean(leg))

    const route: RouteStop[] = orderedCities.map((city, index) => {
      const leg = styleLegs.find((item) => item.to === city.id)
      return {
        cityId: city.id,
        days: daysPerCity[index] ?? 1,
        arrivalMethod: leg?.method.type,
        arrivalDuration: leg?.method.duration,
        arrivalCost: leg?.method.estimatedCost,
        sourceType: sourceMap?.[city.id] ?? 'recommended',
      }
    })

    const itinerary = buildItinerary(orderedCities, daysPerCity, styleLegs, travelStyle)
    const totalTransit = Math.round(styleLegs.reduce((sum, item) => sum + item.method.estimatedCost, 0))
    const stayCostBase = orderedCities.reduce((sum, city, index) => sum + city.budgetPerDay[budgetLevel] * (daysPerCity[index] ?? 1), 0)
    const accommodation = Math.round(stayCostBase * 0.45)
    const food = Math.round(stayCostBase * 0.25)
    const activities = Math.round(stayCostBase * 0.3)

    const totalBudget: BudgetEstimate = {
      accommodation,
      food,
      transit: totalTransit,
      activities,
      total: accommodation + food + activities + totalTransit,
      perDay: Math.round((accommodation + food + activities + totalTransit) / totalDays),
      level: budgetLevel,
    }

    const plan: TravelPlan = {
      id: `smart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: `${totalDays}天申根细化路线`,
      createdAt: new Date().toISOString(),
      totalDays,
      cities: orderedCities.map((city) => city.id),
      route,
      itinerary,
      totalBudget,
      status: 'draft',
      travelStyle,
    }

    return {
      plan,
      selectedCities: orderedCities,
      routePath: orderedCities.map((city) => city.id),
      legs: styleLegs,
      summary: `🧩 细化行程 · ${totalDays}天${orderedCities.length}城`,
    }
  }

  const getAlternativeCities = (
    currentCityId: string,
    prevCityId: string | undefined,
    nextCityId: string | undefined,
    days: number,
    excludeCityIds: string[] = [],
  ): AlternativeCityCandidate[] => {
    const maxLegHours = getMaxLegHours(days)
    const exclusion = new Set([...excludeCityIds, currentCityId])
    const prev = prevCityId ? cityMap.get(prevCityId) : undefined
    const next = nextCityId ? cityMap.get(nextCityId) : undefined

    return unvisitedCities
      .filter((city) => !exclusion.has(city.id))
      .map((city) => {
        const prevTransitHours = prev ? pairTransitHours(prev, city) : undefined
        const nextTransitHours = next ? pairTransitHours(city, next) : undefined
        const validPrev = prevTransitHours === undefined || prevTransitHours <= maxLegHours
        const validNext = nextTransitHours === undefined || nextTransitHours <= maxLegHours
        if (!validPrev || !validNext) return null
        const score = (prevTransitHours ?? 0) + (nextTransitHours ?? 0) + (20 - scorePopularity(city, 'balanced'))
        return {
          city,
          prevTransitHours,
          nextTransitHours,
          score,
          reason: `${city.highlights[0] ?? city.vibes[0] ?? '高匹配度'}`,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => a.score - b.score)
      .slice(0, 8)
      .map(({ score, ...rest }) => rest)
  }

  const getInsertCandidates = (prevCityId: string, nextCityId: string, excludeCityIds: string[] = []): AlternativeCityCandidate[] => {
    const prev = cityMap.get(prevCityId)
    const next = cityMap.get(nextCityId)
    if (!prev || !next) return []
    const baseDistance = haversine(prev.lat, prev.lng, next.lat, next.lng)
    const exclusion = new Set(excludeCityIds)

    return unvisitedCities
      .filter((city) => !exclusion.has(city.id))
      .map((city) => {
        const d1 = haversine(prev.lat, prev.lng, city.lat, city.lng)
        const d2 = haversine(city.lat, city.lng, next.lat, next.lng)
        const detour = Math.abs((d1 + d2) - baseDistance)
        return {
          city,
          prevTransitHours: pairTransitHours(prev, city),
          nextTransitHours: pairTransitHours(city, next),
          detour,
          reason: `位于两城之间，绕行约${Math.round(detour)}km`,
        }
      })
      .sort((a, b) => a.detour - b.detour)
      .slice(0, 10)
      .map(({ detour, ...rest }) => rest)
  }

  const refineUserPlan = (
    mandatoryCities: string[],
    totalDays: number,
    options: RefineOptions,
  ): { result: SmartRecommendResult | null; warning?: string } => {
    const uniqueMandatory = [...new Set(mandatoryCities)].map((id) => cityMap.get(id)).filter((item): item is SchengenCity => Boolean(item))
    if (!uniqueMandatory.length) return { result: null, warning: '请至少选择一个城市' }

    let ordered = options.keepOrder
      ? uniqueMandatory
      : [...uniqueMandatory].sort((a, b) => haversine(51.5074, -0.1278, a.lat, a.lng) - haversine(51.5074, -0.1278, b.lat, b.lng))

    const sourceMap: Record<string, 'mandatory' | 'recommended'> = {}
    ordered.forEach((city) => { sourceMap[city.id] = 'mandatory' })

    if (options.fillConnections && ordered.length >= 2) {
      let safety = 0
      while (ordered.length < Math.min(8, totalDays) && safety < 12) {
        let inserted = false
        for (let i = 0; i < ordered.length - 1; i += 1) {
          const candidates = getInsertCandidates(ordered[i].id, ordered[i + 1].id, ordered.map((city) => city.id))
          const picked = candidates[0]?.city
          if (picked) {
            ordered = [...ordered.slice(0, i + 1), picked, ...ordered.slice(i + 1)]
            sourceMap[picked.id] = 'recommended'
            inserted = true
            break
          }
        }
        if (!inserted) break
        safety += 1
      }
    }

    if (ordered.length > totalDays) {
      return {
        result: buildPlanFromOrderedCities(ordered.slice(0, totalDays), totalDays, options.travelStyle, options.budgetLevel, options.departureCity, sourceMap),
        warning: `你选的城市较多，已按${totalDays}天自动压缩。建议增加天数。`,
      }
    }

    return {
      result: buildPlanFromOrderedCities(ordered, totalDays, options.travelStyle, options.budgetLevel, options.departureCity, sourceMap),
    }
  }

  return {
    allCities,
    unvisitedCities,
    wishlistCities,
    generateRecommendation,
    getAlternativeCities,
    getInsertCandidates,
    refineUserPlan,
    buildPlanFromOrderedCities,
  }
}
