import { useState } from 'react'
import { motion } from 'framer-motion'
import { Marker } from 'react-simple-maps'
import type { SchengenCity } from '../types/city'

interface CityMarkerProps {
  city: SchengenCity
  isVisited: boolean
  isHighlighted?: boolean
  isInWishlist?: boolean
  note?: string
  rating?: number
  onCityClick?: (cityId: string) => void
}

export default function CityMarker({
  city,
  isVisited,
  isHighlighted = false,
  isInWishlist = false,
  note,
  rating,
  onCityClick,
}: CityMarkerProps) {
  const [hovered, setHovered] = useState(false)
  const shortNote = note ? `${note.slice(0, 30)}${note.length > 30 ? '…' : ''}` : ''

  return (
    <Marker coordinates={[city.lng, city.lat]}>
      <g
        className="cursor-pointer"
        onClick={(event) => { event.stopPropagation(); onCityClick?.(city.id) }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {isVisited && (
          <motion.circle
            r={8}
            fill="#7B9EAE"
            opacity={0.3}
            initial={{ scale: 1, opacity: 0.35 }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.35, 0.12, 0.35] }}
            transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
          />
        )}

        <circle
          r={isHighlighted ? 6 : 4.6}
          fill={isVisited ? '#7B9EAE' : '#F5F2EE'}
          stroke={isVisited ? '#4E7688' : '#A9A09A'}
          strokeWidth={isHighlighted ? 2 : 1.6}
        />

        {isInWishlist && (
          <text x={6} y={-5} fontSize={11} fill="#9B8EA8">
            ★
          </text>
        )}

        {hovered && (
          <g transform="translate(10,-10)">
            <rect
              x={0}
              y={-42}
              width={182}
              height={rating ? (shortNote ? 56 : 44) : shortNote ? 40 : 26}
              rx={8}
              fill="#fff"
              stroke="#C8C2BC"
              strokeWidth={1}
              opacity={0.97}
            />
            <text x={8} y={-25} fontSize={11} fill="#3c3c3c">
              {city.flag} {city.nameZh}
            </text>
            {rating ? (
              <text x={8} y={-10} fontSize={10} fill="#9B8EA8">
                {'★'.repeat(Math.max(1, Math.min(5, rating)))}
              </text>
            ) : null}
            {shortNote && (
              <text x={8} y={rating ? 5 : -10} fontSize={10} fill="#6b6b6b">
                {shortNote}
              </text>
            )}
          </g>
        )}
      </g>
    </Marker>
  )
}
