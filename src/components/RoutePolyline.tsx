import { motion } from 'framer-motion'
import type { SchengenCity } from '../types/city'
import { getTransitOptions } from '../utils/transit'

interface RoutePolylineProps {
  routePath: string[]
  cities: SchengenCity[]
  projection: (coordinates: [number, number]) => [number, number] | null
  zoomLevel?: number
}

const METHOD_ICON: Record<string, string> = { train: '🚄', flight: '✈️', bus: '🚌', ferry: '⛴️', car: '🚗' }

export default function RoutePolyline({ routePath, cities, projection, zoomLevel = 1 }: RoutePolylineProps) {
  if (routePath.length < 2) return null

  const cityMap = new Map(cities.map((city) => [city.id, city]))

  const segments = routePath
    .map((cityId, index) => {
      const nextId = routePath[index + 1]
      if (!nextId) return null
      const from = cityMap.get(cityId)
      const to = cityMap.get(nextId)
      if (!from || !to) return null

      const fromPoint = projection([from.lng, from.lat])
      const toPoint = projection([to.lng, to.lat])
      if (!fromPoint || !toPoint) return null

      const transit = getTransitOptions(from.id, to.id, cityMap)
      const method = transit.recommended

      return {
        key: `${from.id}-${to.id}-${index}`,
        path: `M ${fromPoint[0]} ${fromPoint[1]} L ${toPoint[0]} ${toPoint[1]}`,
        midX: (fromPoint[0] + toPoint[0]) / 2,
        midY: (fromPoint[1] + toPoint[1]) / 2,
        method,
      }
    })
    .filter((segment): segment is NonNullable<typeof segment> => Boolean(segment))

  return (
    <g>
      <defs>
        <marker id="route-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L8,4 L0,8 z" fill="#9B8EA8" />
        </marker>
      </defs>

      {segments.map((segment, index) => (
        <g key={segment.key}>
          <motion.path
            d={segment.path}
            stroke="#9B8EA8"
            strokeWidth={2.2}
            strokeDasharray="7 5"
            fill="none"
            markerEnd="url(#route-arrow)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.9, delay: index * 0.18, ease: 'easeOut' }}
          />

          {zoomLevel >= 3 ? (
            <g>
              <circle cx={segment.midX} cy={segment.midY - 7} r={11} fill="#F5F2EE" stroke="#C8C2BC" />
              <text x={segment.midX} y={segment.midY - 4} textAnchor="middle" fontSize={12}>
                {METHOD_ICON[segment.method.type] ?? '🚄'}
              </text>
              <text x={segment.midX} y={segment.midY + 12} textAnchor="middle" fontSize={10} fill="#7B9EAE" stroke="#F5F2EE" strokeWidth={3} paintOrder="stroke">
                {segment.method.duration.replace(' ', '')}
              </text>
              <title>{`${segment.method.name ?? segment.method.type} · ${segment.method.duration} · ${segment.method.costRange ?? `€${segment.method.estimatedCost}`}`}</title>
            </g>
          ) : null}
        </g>
      ))}
    </g>
  )
}
