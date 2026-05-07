import { useMemo } from 'react'
import transitMatrixData from '../data/transit-matrix.json'
import type { SchengenCity, TransitMethod, TransitRoute } from '../types/city'

interface OptimizeInput {
  startCityId: string
  cityIds: string[]
  cityMap: Map<string, SchengenCity>
}

export interface OptimizedLeg {
  from: string
  to: string
  method: TransitMethod
  distanceKm: number
}

export interface OptimizedRoute {
  orderedCityIds: string[]
  legs: OptimizedLeg[]
}

const LONDON_COORDS: [number, number] = [51.5074, -0.1278]

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function estimateTransit(distanceKm: number): TransitMethod {
  if (distanceKm < 300) {
    return {
      type: 'train',
      duration: `${Math.max(1, Math.round(distanceKm / 120))}h`,
      estimatedCost: Math.round(20 + distanceKm * 0.12),
      recommended: true,
    }
  }

  if (distanceKm <= 800) {
    const useTrain = Math.random() > 0.45
    return {
      type: useTrain ? 'train' : 'flight',
      duration: useTrain
        ? `${Math.max(2, Math.round(distanceKm / 140))}h`
        : `${(distanceKm / 680 + 1.1).toFixed(1)}h`,
      estimatedCost: Math.round((useTrain ? 25 : 35) + distanceKm * (useTrain ? 0.1 : 0.11)),
      recommended: true,
    }
  }

  return {
    type: 'flight',
    duration: `${(distanceKm / 760 + 1.5).toFixed(1)}h`,
    estimatedCost: Math.round(45 + distanceKm * 0.1),
    recommended: true,
  }
}

export function useRouteOptimize() {
  const transitMap = useMemo(() => {
    return (transitMatrixData as TransitRoute[]).reduce<Map<string, TransitRoute>>((acc, route) => {
      acc.set([route.from, route.to].sort().join('__'), route)
      return acc
    }, new Map())
  }, [])

  const optimizeRoute = ({ startCityId, cityIds, cityMap }: OptimizeInput): OptimizedRoute => {
    if (!cityIds.length) {
      return { orderedCityIds: [], legs: [] }
    }

    const pool = [...cityIds]
    const ordered: string[] = []

    const startCity = cityMap.get(startCityId)
    let currentPoint: [number, number] = startCity
      ? [startCity.lat, startCity.lng]
      : startCityId === 'london'
        ? LONDON_COORDS
        : LONDON_COORDS

    while (pool.length) {
      let nearestIndex = 0
      let nearestDistance = Number.POSITIVE_INFINITY

      pool.forEach((cityId, index) => {
        const city = cityMap.get(cityId)
        if (!city) return
        const distance = haversine(currentPoint[0], currentPoint[1], city.lat, city.lng)
        if (distance < nearestDistance) {
          nearestDistance = distance
          nearestIndex = index
        }
      })

      const next = pool.splice(nearestIndex, 1)[0]
      ordered.push(next)
      const nextCity = cityMap.get(next)
      if (nextCity) {
        currentPoint = [nextCity.lat, nextCity.lng]
      }
    }

    const fullPath = [startCityId, ...ordered]

    const legs: OptimizedLeg[] = fullPath
      .slice(0, -1)
      .map((from, index) => {
        const to = fullPath[index + 1]
        const fromCoord = from === 'london' ? LONDON_COORDS : cityMap.get(from)
        const toCoord = to === 'london' ? LONDON_COORDS : cityMap.get(to)

        if (!fromCoord || !toCoord) return null

        const fromLat = Array.isArray(fromCoord) ? fromCoord[0] : fromCoord.lat
        const fromLng = Array.isArray(fromCoord) ? fromCoord[1] : fromCoord.lng
        const toLat = Array.isArray(toCoord) ? toCoord[0] : toCoord.lat
        const toLng = Array.isArray(toCoord) ? toCoord[1] : toCoord.lng

        const distanceKm = haversine(fromLat, fromLng, toLat, toLng)
        const transit = transitMap.get([from, to].sort().join('__'))
        const method = transit?.methods.find((item) => item.recommended) ?? transit?.methods[0]

        return {
          from,
          to,
          method: method ?? estimateTransit(distanceKm),
          distanceKm,
        }
      })
      .filter((item): item is OptimizedLeg => Boolean(item))

    return { orderedCityIds: ordered, legs }
  }

  const swapCity = (cityIds: string[], oldCityId: string, newCityId: string) =>
    cityIds.map((cityId) => (cityId === oldCityId ? newCityId : cityId))

  const removeCity = (cityIds: string[], cityId: string) => cityIds.filter((id) => id !== cityId)

  const insertCity = (cityIds: string[], cityId: string, index: number) => {
    const next = [...cityIds]
    next.splice(index, 0, cityId)
    return next
  }

  return { optimizeRoute, swapCity, removeCity, insertCity }
}
