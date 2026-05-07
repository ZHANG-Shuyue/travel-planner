import { useSortable } from '@dnd-kit/sortable'
import type { SchengenCity } from '../types/city'

interface WishlistCardProps {
  city: SchengenCity
  onRemove: (cityId: string) => void
  onStartPlanning?: (cityId: string) => void
}

export default function WishlistCard({ city, onRemove, onStartPlanning }: WishlistCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: city.id,
  })

  const style = {
    transform: transform
      ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0) scale(${transform.scaleX}, ${transform.scaleY})`
      : undefined,
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-muted/60 bg-white p-3 shadow-sm dark:bg-dark-card ${isDragging ? 'opacity-70' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between">
        <h3 className="font-medium text-slate-700 dark:text-slate-100">
          {city.flag} {city.nameZh}
        </h3>
        <button className="text-sm text-red-500" onClick={() => onRemove(city.id)}>
          ✕
        </button>
      </div>

      <p className="mt-1 text-xs text-slate-500">{city.highlights[0]}</p>

      <div className="mt-2 flex flex-wrap gap-1">
        {city.bestMonths.slice(0, 4).map((month) => (
          <span key={month} className="rounded-full bg-secondary/30 px-2 py-0.5 text-[10px]">
            {month}月
          </span>
        ))}
      </div>

      <p className="mt-2 text-xs text-slate-600 dark:text-slate-200">
        日均：€{city.budgetPerDay.budget} / €{city.budgetPerDay.mid} / €{city.budgetPerDay.luxury}
      </p>

      <button
        className="mt-3 rounded-full bg-primary/15 px-3 py-1 text-xs text-primary"
        onClick={() => onStartPlanning?.(city.id)}
      >
        以此城市开始规划
      </button>
    </div>
  )
}
