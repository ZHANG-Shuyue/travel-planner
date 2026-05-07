import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMemo, useState } from 'react'
import type { SchengenCity } from '../types/city'

interface CityTagInputProps {
  cities: SchengenCity[]
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}

function SortableTag({ id, label, onRemove }: { id: string; label: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  return (
    <span
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"
      {...attributes}
      {...listeners}
    >
      <span className="cursor-grab">⋮⋮</span>
      {label}
      <button className="rounded-full px-1 text-slate-500 hover:bg-red-100 hover:text-red-600" onClick={onRemove}>
        ✕
      </button>
    </span>
  )
}

export default function CityTagInput({ cities, value, onChange, placeholder = '搜索城市并添加' }: CityTagInputProps) {
  const [query, setQuery] = useState('')
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const selectedSet = useMemo(() => new Set(value), [value])
  const selectedCities = useMemo(() => value.map((id) => cities.find((city) => city.id === id)).filter((item): item is SchengenCity => Boolean(item)), [cities, value])

  const options = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return cities
      .filter((city) => !selectedSet.has(city.id))
      .filter((city) => {
        if (!keyword) return true
        return (
          city.name.toLowerCase().includes(keyword) ||
          city.nameZh.toLowerCase().includes(keyword) ||
          city.country.toLowerCase().includes(keyword) ||
          city.countryZh.toLowerCase().includes(keyword)
        )
      })
      .slice(0, 10)
  }, [cities, query, selectedSet])

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = value.findIndex((id) => id === active.id)
    const newIndex = value.findIndex((id) => id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onChange(arrayMove(value, oldIndex, newIndex))
  }

  return (
    <div className="rounded-xl border border-muted/60 p-3">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="w-full rounded-lg border border-muted/60 px-3 py-2 text-sm"
        placeholder={placeholder}
      />

      {!!options.length && query ? (
        <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-muted/40 bg-white p-1 dark:bg-dark-card">
          {options.map((city) => (
            <button
              key={city.id}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/35"
              onClick={() => {
                onChange([...value, city.id])
                setQuery('')
              }}
            >
              <span>{city.flag} {city.nameZh}</span>
              <span className="text-xs text-slate-500">{city.countryZh}</span>
            </button>
          ))}
        </div>
      ) : null}

      {selectedCities.length ? (
        <div className="mt-3 rounded-lg bg-muted/20 p-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={value} strategy={horizontalListSortingStrategy}>
              <div className="flex flex-wrap gap-2">
                {selectedCities.map((city) => (
                  <SortableTag
                    key={city.id}
                    id={city.id}
                    label={`${city.flag} ${city.nameZh}`}
                    onRemove={() => onChange(value.filter((id) => id !== city.id))}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-500">至少选择 1 个必去城市。拖拽标签可调整顺序。</p>
      )}
    </div>
  )
}
