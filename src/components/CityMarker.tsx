import { useState } from 'react'
import { Marker } from 'react-simple-maps'
import type { SchengenCity } from '../types/city'

interface CityMarkerProps {
  city: SchengenCity
  isVisited: boolean
  isHighlighted?: boolean
  isInWishlist?: boolean
  note?: string
  rating?: number
  zoomLevel?: number
  stayDays?: number
  transitIcon?: string
  onCityClick?: (cityId: string) => void
}

export default function CityMarker({
  city,
  isVisited,
  isHighlighted = false,
  isInWishlist = false,
  note,
  rating,
  zoomLevel = 1,
  stayDays,
  transitIcon,
  onCityClick,
}: CityMarkerProps) {
  const [hovered, setHovered] = useState(false)
  const shortNote = note ? `${note.slice(0, 30)}${note.length > 30 ? '…' : ''}` : ''

  const tinyMode = zoomLevel < 2
  const normalLabelMode = zoomLevel >= 2 && zoomLevel <= 4
  const richMode = zoomLevel > 4

  return (
    <Marker coordinates={[city.lng, city.lat]}>
      <g
        className="cursor-pointer"
        onClick={(event) => { event.stopPropagation(); onCityClick?.(city.id) }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {isVisited && (
          <circle
            r={tinyMode ? 4 : 8}
            fill="#7B9EAE"
            opacity={0.3}
          />
        )}

        <circle
          r={tinyMode ? 2.8 : isHighlighted ? 6 : 4.6}
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
          tinyMode ? (
            <g transform="translate(8,-8)">
              <rect x={0} y={-22} width={88} height={20} rx={6} fill="#fff" stroke="#C8C2BC" strokeWidth={1} opacity={0.97} />
              <text x={6} y={-9} fontSize={10} fill="#3c3c3c">
                {city.nameZh}
              </text>
            </g>
          ) : (
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
          )
        )}

        {normalLabelMode ? (
          <text x={8} y={4} fontSize={10} fill="#4d4d4d" stroke="#fff" strokeWidth={2} paintOrder="stroke">
            {city.nameZh}
          </text>
        ) : null}

        {richMode ? (
          <text x={8} y={4} fontSize={10} fill="#4d4d4d" stroke="#fff" strokeWidth={2} paintOrder="stroke">
            {city.nameZh}
            {typeof stayDays === 'number' ? ` · ${stayDays}天` : ''}
            {transitIcon ? ` ${transitIcon}` : ''}
          </text>
        ) : null}
      </g>
    </Marker>
  )
}
