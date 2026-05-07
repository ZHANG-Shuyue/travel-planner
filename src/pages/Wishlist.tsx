import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import citiesData from '../data/schengen-cities.json'
import BudgetReference from '../components/BudgetReference'
import WishlistCard from '../components/WishlistCard'
import { useUserStore } from '../stores/useUserStore'
import type { SchengenCity } from '../types/city'

const cityMap = new Map((citiesData as SchengenCity[]).map((city) => [city.id, city]))

export default function Wishlist() {
  const navigate = useNavigate()
  const wishlist = useUserStore((state) => state.wishlist)
  const removeFromWishlist = useUserStore((state) => state.removeFromWishlist)

  const [order, setOrder] = useState<string[]>(wishlist)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const month = new Date().getMonth() + 1

  useEffect(() => {
    setOrder((prev) => {
      const remain = prev.filter((id) => wishlist.includes(id))
      const append = wishlist.filter((id) => !remain.includes(id))
      return [...remain, ...append]
    })
  }, [wishlist])

  const cities = useMemo(() => {
    const base = order.length ? order : wishlist
    return base.map((cityId) => cityMap.get(cityId)).filter((city): city is SchengenCity => Boolean(city))
  }, [order, wishlist])

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setOrder((prev) => {
      const ids = prev.length ? prev : wishlist
      const oldIndex = ids.indexOf(String(active.id))
      const newIndex = ids.indexOf(String(over.id))
      if (oldIndex < 0 || newIndex < 0) return ids
      return arrayMove(ids, oldIndex, newIndex)
    })
  }

  if (!wishlist.length) {
    return (
      <div className="rounded-2xl border border-muted/60 bg-white p-10 text-center dark:bg-dark-card">
        <div className="text-6xl">🧳</div>
        <p className="mt-2 text-lg font-medium">你的心愿单还空空的</p>
        <p className="text-sm text-slate-500">去足迹页面收藏想去的城市吧</p>
        <button className="mt-4 rounded-full bg-primary px-5 py-2 text-sm text-white" onClick={() => navigate('/footprints')}>
          去收藏城市
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-muted/60 bg-white p-4 dark:bg-dark-card">
        <h2 className="font-title text-2xl">我的心愿单 <span className="rounded-full bg-secondary/30 px-2 py-0.5 text-sm">{cities.length}</span></h2>
        <p className="text-sm text-slate-500">想去的地方，先收藏再说</p>
      </section>

      <section className="rounded-2xl border border-muted/60 bg-white p-4 dark:bg-dark-card">
        <p className="mb-3 text-sm text-slate-500">拖拽调整优先级，排在前面的会优先纳入规划</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={cities.map((city) => city.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {cities.map((city) => (
                <div key={city.id} className="space-y-2">
                  <WishlistCard city={city} onRemove={removeFromWishlist} />
                  <div className="rounded-xl border border-muted/50 p-2">
                    {city.bestMonths.includes(month) ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">现在正当季！</span>
                    ) : null}
                    <div className="mt-2">
                      <BudgetReference budgetPerDay={city.budgetPerDay} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </section>

      <section className="rounded-2xl border border-muted/60 bg-white p-4 dark:bg-dark-card">
        <button
          className="w-full rounded-full bg-purple px-5 py-3 text-sm text-white"
          onClick={() => navigate('/planner', { state: { wishlistPriority: true, requiredCityIds: cities.map((city) => city.id) } })}
        >
          一键规划心愿单路线
        </button>
        <p className="mt-2 text-center text-xs text-slate-500">将为你串联 {cities.length} 个心愿城市的最优路线</p>
      </section>
    </div>
  )
}
