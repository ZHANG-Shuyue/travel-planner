import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useUserStore } from '../stores/useUserStore'
import type { VisaInfo } from '../types/user'

const defaultVisaInfo: VisaInfo = {
  enabled: false,
  autoCountFromFootprints: true,
}

export default function VisaInfoSettings() {
  const visaInfo = useUserStore((state) => state.visaInfo)
  const visitedCities = useUserStore((state) => state.visitedCities)
  const setVisaInfo = useUserStore((state) => state.setVisaInfo)
  const clearVisaInfo = useUserStore((state) => state.clearVisaInfo)

  const [draft, setDraft] = useState<VisaInfo>(visaInfo ?? defaultVisaInfo)

  useEffect(() => {
    setDraft(visaInfo ?? defaultVisaInfo)
  }, [visaInfo])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisaInfo(draft)
    }, 500)
    return () => window.clearTimeout(timer)
  }, [draft, setVisaInfo])

  const autoUsedDays = useMemo(
    () => visitedCities.reduce((sum, item) => sum + (item.duration ?? 0), 0),
    [visitedCities],
  )

  const update = (next: Partial<VisaInfo>) => setDraft((prev) => ({ ...prev, ...next }))

  return (
    <section className="rounded-xl border border-muted/60 bg-background/60 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">签证信息</p>
          {!draft.enabled ? (
            <p className="mt-1 text-xs text-slate-500">开启后可提醒你签证剩余天数，纯属可选，不填也完全不影响使用</p>
          ) : null}
        </div>
        <button
          className={`rounded-full px-3 py-1 text-xs ${draft.enabled ? 'bg-primary text-white' : 'bg-muted/40'}`}
          onClick={() => update({ enabled: !draft.enabled })}
        >
          {draft.enabled ? '已启用' : '启用签证提醒'}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {draft.enabled ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3 text-sm">
              <div className="grid gap-2 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs text-slate-500">签证起始日</span>
                  <input
                    type="date"
                    value={draft.visaStartDate ?? ''}
                    onChange={(event) => update({ visaStartDate: event.target.value || undefined })}
                    className="w-full rounded border border-muted/60 px-2 py-1"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-slate-500">签证截止日</span>
                  <input
                    type="date"
                    value={draft.visaEndDate ?? ''}
                    onChange={(event) => update({ visaEndDate: event.target.value || undefined })}
                    className="w-full rounded border border-muted/60 px-2 py-1"
                  />
                </label>
              </div>

              <div>
                <p className="text-xs text-slate-500">允许停留天数</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={draft.allowedDays ?? ''}
                    onChange={(event) => update({ allowedDays: event.target.value ? Number(event.target.value) : undefined })}
                    className="w-28 rounded border border-muted/60 px-2 py-1"
                    placeholder="如 30"
                  />
                  {[15, 30, 60, 90].map((day) => (
                    <button key={day} className="rounded-full bg-muted/40 px-2.5 py-1 text-xs" onClick={() => update({ allowedDays: day })}>
                      {day}天
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                  <span>已使用天数</span>
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={!draft.autoCountFromFootprints}
                      onChange={(event) => update({ autoCountFromFootprints: !event.target.checked })}
                    />
                    手动输入
                  </label>
                </div>
                {draft.autoCountFromFootprints ? (
                  <p className="rounded border border-dashed border-muted/60 bg-white/70 px-2 py-1 text-sm dark:bg-dark-card">自动累计：{autoUsedDays} 天（来自足迹 duration）</p>
                ) : (
                  <input
                    type="number"
                    min={0}
                    value={draft.usedDays ?? ''}
                    onChange={(event) => update({ usedDays: event.target.value ? Number(event.target.value) : undefined })}
                    className="w-28 rounded border border-muted/60 px-2 py-1"
                    placeholder="已用天数"
                  />
                )}
              </div>

              <label className="block space-y-1">
                <span className="text-xs text-slate-500">签证类型备注</span>
                <input
                  value={draft.notes ?? ''}
                  onChange={(event) => update({ notes: event.target.value || undefined })}
                  className="w-full rounded border border-muted/60 px-2 py-1"
                  placeholder="如：C类多次入境、单次入境30天"
                />
              </label>

              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-500">此信息仅用于在规划行程时提醒你剩余天数，所有数据仅存储在本地浏览器中</p>
                <button className="rounded-full bg-red-100 px-3 py-1 text-xs text-red-600" onClick={clearVisaInfo}>
                  清空
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  )
}
