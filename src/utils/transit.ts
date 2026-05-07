import transitMatrix from '../data/transit-matrix.json'
import type { SchengenCity, TransitMethod, TransitRoute } from '../types/city'

const routeMap = (transitMatrix as TransitRoute[]).reduce<Map<string, TransitRoute>>((acc, route) => {
  acc.set([route.from, route.to].sort().join('__'), route)
  return acc
}, new Map())

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function parseDurationToHours(duration: string) {
  const text = duration.toLowerCase().trim()
  const hourDecimal = text.match(/(\d+(?:\.\d+)?)h/)
  const mins = text.match(/(\d+)\s*m/)
  const h = hourDecimal ? Number(hourDecimal[1]) : 0
  const m = mins ? Number(mins[1]) : 0
  return h + m / 60
}

export function getTransitOptions(fromId: string, toId: string, cityMap: Map<string, SchengenCity>) {
  const key = [fromId, toId].sort().join('__')
  const route = routeMap.get(key)
  if (route) {
    const recommended = route.methods.find((method) => method.recommended) ?? route.methods[0]
    return { methods: route.methods, recommended, estimated: false, distanceKm: null as number | null }
  }

  const from = cityMap.get(fromId)
  const to = cityMap.get(toId)
  if (!from || !to) {
    const fallback: TransitMethod = {
      type: 'train',
      duration: '2h',
      estimatedCost: 60,
      recommended: true,
      name: '城际交通（估算）',
      costRange: '€40-80',
    }
    return { methods: [fallback], recommended: fallback, estimated: true, distanceKm: null as number | null }
  }

  const distanceKm = haversine(from.lat, from.lng, to.lat, to.lng)
  let inferred: TransitMethod
  if (distanceKm < 200) {
    inferred = { type: 'train', duration: '1-2h', estimatedCost: 35, recommended: true, name: '区域火车', costRange: '€20-50' }
  } else if (distanceKm < 500) {
    inferred = { type: 'train', duration: '2-4h', estimatedCost: 70, recommended: true, name: '城际火车', costRange: '€40-100' }
  } else if (distanceKm <= 1000) {
    inferred = { type: 'flight', duration: '1-3h', estimatedCost: 110, recommended: true, name: '廉航 / 高速铁路', costRange: '€50-150' }
  } else {
    inferred = { type: 'flight', duration: '1.5-3h', estimatedCost: 150, recommended: true, name: '欧洲短途航班', costRange: '€60-200' }
  }

  return { methods: [inferred], recommended: inferred, estimated: true, distanceKm }
}
