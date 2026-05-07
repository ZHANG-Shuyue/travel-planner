import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import SchengenMap from '../components/SchengenMap'
import DayCard from '../components/DayCard'
import BudgetReference from '../components/BudgetReference'
import InspirationLinks from '../components/InspirationLinks'
import PlanComparison from '../components/PlanComparison'
import TransitCard from '../components/TransitCard'
import DayTripSuggestionCard from '../components/DayTripSuggestionCard'
import VisaInfoSettings from '../components/VisaInfoSettings'
import CityTagInput from '../components/CityTagInput'
import SwapCityPanel from '../components/SwapCityPanel'
import InsertCityPanel from '../components/InsertCityPanel'
import { useSmartRecommend, type PreferenceTag, type SmartRecommendResult } from '../hooks/useSmartRecommend'
import { useRouteOptimize } from '../hooks/useRouteOptimize'
import { checkHolidaysForPlan } from '../hooks/useHolidayCheck'
import { useUserStore } from '../stores/useUserStore'
import type { DayPlan, TravelStyle } from '../types/plan'
import citiesData from '../data/schengen-cities.json'
import type { SchengenCity } from '../types/city'
import type { HolidayConflict } from '../types/holiday'
import { getTransitOptions, parseDurationToHours } from '../utils/transit'
import { exportItineraryPDF } from '../utils/exportPDF'

const preferenceTags: PreferenceTag[] = ['文化', '美食', '自然', '海滨', '城市探索', '小众冒险']
const cityData = citiesData as SchengenCity[]
const cityMap = new Map(cityData.map((city) => [city.id, city]))
const iconMap: Record<string, string> = { train: '🚄', flight: '✈️', bus: '🚌', car: '🚗', ferry: '⛴️' }

const styleMeta: Record<TravelStyle, { icon: string; title: string; desc: string; pace: string }> = {
  speedrun: { icon: '⚡', title: '特种兵', desc: '短时间打卡尽可能多城市，暴走节奏', pace: '约 5-6 城/周' },
  balanced: { icon: '🎒', title: '经典游', desc: '该看的看到，也不会太累', pace: '约 2-3 城/周' },
  relaxed: { icon: '🏖️', title: '度假游', desc: '不赶行程，享受当下', pace: '约 1-2 城/周' },
  deep: { icon: '🔍', title: '深度游', desc: '一个城市待够，沉浸体验', pace: '约 1 城/周' },
}

function SortableDayItem({
  day,
  city,
  dateLabel,
  travelStyle,
  transitBadge,
  stayRecommendation,
  showStayComparison,
  arrivalTransportTip,
  onChange,
  hideActions,
}: {
  day: DayPlan
  city: SchengenCity
  dateLabel?: string
  travelStyle: TravelStyle
  transitBadge?: { icon: string; text: string; morningText: string }
  stayRecommendation?: SchengenCity['stayAreas'][number]
  showStayComparison?: boolean
  arrivalTransportTip?: SchengenCity['localTransport']
  onChange: (next: DayPlan) => void
  hideActions?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: day.dayNumber })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} {...attributes} {...listeners}>
      <DayCard
        dayPlan={day}
        city={city}
        dateLabel={dateLabel}
        editable
        onChange={onChange}
        transitBadge={transitBadge}
        travelStyle={travelStyle}
        stayRecommendation={stayRecommendation}
        stayAreas={showStayComparison ? city.stayAreas : undefined}
        arrivalTransportTip={arrivalTransportTip}
        hideActions={hideActions}
      />
    </div>
  )
}

function stylePrompt(style: TravelStyle) {
  if (style === 'speedrun') return '用户是特种兵旅行风格，每天行程要排满，早上8点出门晚上10点回酒店，每个时段安排2-3项紧凑活动。'
  if (style === 'balanced') return '用户选择经典旅行风格，每天安排2-3个主要景点即可，留出适当休息和闲逛时间。'
  if (style === 'relaxed') return '用户是度假休闲风格，每天上午安排一项轻松活动，下午留作自由活动，晚上推荐氛围餐厅。'
  return '用户选择深度探索风格，可以安排主题日，节奏缓慢，融入本地生活感。'
}

function normalizeAiItinerary(payload: unknown): DayPlan[] | null {
  if (!payload || typeof payload !== 'object') return null
  const data = payload as { itinerary?: unknown; days?: unknown; plan?: { itinerary?: unknown } }
  const candidate = data.itinerary ?? data.days ?? data.plan?.itinerary
  if (!Array.isArray(candidate)) return null
  const normalized = candidate.filter((item): item is DayPlan => {
    if (!item || typeof item !== 'object') return false
    const row = item as Partial<DayPlan>
    return typeof row.dayNumber === 'number' && typeof row.cityId === 'string' && typeof row.morning === 'string' && typeof row.afternoon === 'string' && typeof row.evening === 'string'
  })
  return normalized.length ? normalized : null
}

async function generateAiItinerary(routeInfo: string, fallback: DayPlan[], travelStyle: TravelStyle, userApiKey?: string) {
  const response = await fetch('/api/generate-itinerary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content: `你是申根旅行专家。根据以下路线生成逐日行程。${stylePrompt(travelStyle)}每天分上午/下午/晚上三个时段。每个时段只列出地点名称和预计停留时长，格式为“地点名（Xh）”，多个地点用箭头→连接。不要写描述性段落。务必只输出 JSON 对象，结构为 {"itinerary":[{"dayNumber":1,"cityId":"paris","morning":"...","afternoon":"...","evening":"...","restaurant":"...","transitNote":"..."}]}。`,
        },
        { role: 'user', content: routeInfo },
      ],
      userApiKey: userApiKey || undefined,
    }),
  })
  const raw = await response.json()
  console.log('[AI itinerary] /api/generate-itinerary status:', response.status, 'ok:', response.ok, 'raw:', raw)
  if (!response.ok) {
    return { itinerary: fallback, usedAi: false, reason: `HTTP_${response.status}` as const }
  }
  const typed = raw as { choices?: Array<{ message?: { content?: string } }> }
  try {
    const content = typed.choices?.[0]?.message?.content
    if (!content) return { itinerary: fallback, usedAi: false, reason: 'EMPTY_CONTENT' as const }
    const parsed = JSON.parse(content) as unknown
    const normalized = normalizeAiItinerary(parsed)
    if (normalized) return { itinerary: normalized, usedAi: true as const }
    return { itinerary: fallback, usedAi: false, reason: 'PARSE_SCHEMA_MISMATCH' as const }
  } catch {
    return { itinerary: fallback, usedAi: false, reason: 'PARSE_JSON_ERROR' as const }
  }
}

export default function SmartPlanner() {
  const location = useLocation()
  const prefill = (location.state as { requiredCityIds?: string[]; wishlistPriority?: boolean } | null) ?? null

  const {
    generateRecommendation,
    allCities,
    getAlternativeCities,
    getInsertCandidates,
    refineUserPlan,
    buildPlanFromOrderedCities,
  } = useSmartRecommend()
  const { swapCity, removeCity, insertCity } = useRouteOptimize()
  const savePlan = useUserStore((state) => state.savePlan)
  const settings = useUserStore((state) => state.settings)
  const visaInfo = useUserStore((state) => state.visaInfo)
  const visitedCities = useUserStore((state) => state.visitedCities)
  const updateSettings = useUserStore((state) => state.updateSettings)
  const wishlist = useUserStore((state) => state.wishlist)
  const visitedCityIds = visitedCities.map((item) => item.cityId)

  const [days, setDays] = useState(7)
  const [plannerMode, setPlannerMode] = useState<'zero' | 'refine'>('zero')
  const [departureCity, setDepartureCity] = useState('london')
  const [selectedPreferences, setSelectedPreferences] = useState<PreferenceTag[]>([])
  const [travelStyle, setTravelStyle] = useState<TravelStyle>('balanced')
  const [budgetLevel, setBudgetLevel] = useState<'budget' | 'mid' | 'luxury'>('mid')
  const [wishlistPriority, setWishlistPriority] = useState(prefill?.wishlistPriority ?? true)
  const [requiredCityIds, setRequiredCityIds] = useState<string[]>(prefill?.requiredCityIds ?? [])
  const [mandatoryCityIds, setMandatoryCityIds] = useState<string[]>(prefill?.requiredCityIds ?? [])
  const [fillConnections, setFillConnections] = useState(true)
  const [activeTab, setActiveTab] = useState<'map' | 'itinerary' | 'inspiration'>('map')
  const [planStartDate, setPlanStartDate] = useState('')
  const [mainResult, setMainResult] = useState<SmartRecommendResult | null>(null)
  const [altResults, setAltResults] = useState<SmartRecommendResult[]>([])
  const [excludedCities, setExcludedCities] = useState<string[]>([])
  const [excludedCombos, setExcludedCombos] = useState<string[][]>([])
  const [itinerary, setItinerary] = useState<DayPlan[]>([])
  const [loadingItinerary, setLoadingItinerary] = useState(false)
  const [loadingRecommend, setLoadingRecommend] = useState(false)
  const [recommendationNotice, setRecommendationNotice] = useState<string | null>(null)
  const [aiRenderStatus, setAiRenderStatus] = useState<{ source: 'ai' | 'fallback' | 'pending'; reason?: string } | null>(null)
  const [showRegenerateHint, setShowRegenerateHint] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [holidayConflicts, setHolidayConflicts] = useState<HolidayConflict[]>([])
  const [dismissedHolidayAlertIds, setDismissedHolidayAlertIds] = useState<string[]>([])
  const [showHolidayPanel, setShowHolidayPanel] = useState(true)
  const [apiKeyDraft, setApiKeyDraft] = useState(settings.apiKey ?? '')
  const [swapIndex, setSwapIndex] = useState<number | null>(null)
  const [swapCandidates, setSwapCandidates] = useState<ReturnType<typeof getAlternativeCities>>([])
  const [insertBetween, setInsertBetween] = useState<{ prevId: string; nextId: string; atIndex: number } | null>(null)
  const [exportState, setExportState] = useState<'idle' | 'loading' | 'success'>('idle')
  const exportContainerRef = useRef<HTMLDivElement | null>(null)
  const resultSectionRef = useRef<HTMLElement | null>(null)
  const [settingsCollapsed, setSettingsCollapsed] = useState(false)
  const [showRefineMapPicker, setShowRefineMapPicker] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const departureOptions = useMemo(
    () => [
      'london',
      ...Array.from(new Set(visitedCityIds)).filter((id) => id !== 'london' && cityMap.has(id)),
    ],
    [visitedCityIds],
  )

  useEffect(() => {
    const seen = localStorage.getItem('smart-planner-api-guide-seen') === '1'
    if (!seen || !settings.apiKey) setShowSettingsModal(true)
  }, [settings.apiKey])

  useEffect(() => {
    if (mainResult) setShowRegenerateHint(mainResult.plan.totalDays !== days)
  }, [days, mainResult])

  const doGenerate = async (append = false) => {
    setLoadingRecommend(true)
    setRecommendationNotice(null)
    await new Promise((resolve) => window.setTimeout(resolve, 120))
    const result = generateRecommendation({
      days,
      departureCity,
      preferenceTags: selectedPreferences,
      budgetLevel,
      wishlistPriority,
      travelStyle,
      requiredCityIds,
      excludedCityIds: excludedCities,
      excludedCombos,
    })
    if (!result) {
      setLoadingRecommend(false)
      setRecommendationNotice('暂无合适推荐，请尝试减少必经城市、增加天数或更换偏好。')
      return
    }
    setExcludedCombos((prev) => [...prev, result.plan.cities])
    if (append) setAltResults((prev) => [...prev.slice(-1), result])
    else {
      setMainResult(result)
      setAltResults([])
      setItinerary(result.plan.itinerary)
      setDismissedHolidayAlertIds([])
      setAiRenderStatus(null)
      setSettingsCollapsed(true)
    }
    setLoadingRecommend(false)
  }

  const doRefineGenerate = async () => {
    setLoadingRecommend(true)
    setRecommendationNotice(null)
    await new Promise((resolve) => window.setTimeout(resolve, 120))
    const refined = refineUserPlan(mandatoryCityIds, days, {
      departureCity,
      travelStyle,
      budgetLevel,
      preferenceTags: selectedPreferences,
      fillConnections,
      keepOrder: true,
    })
    if (!refined.result) {
      setLoadingRecommend(false)
      setRecommendationNotice(refined.warning ?? '暂无合适推荐')
      return
    }
    setMainResult(refined.result)
    setItinerary(refined.result.plan.itinerary)
    setAltResults([])
    setDismissedHolidayAlertIds([])
    setAiRenderStatus(null)
    setSettingsCollapsed(true)
    if (refined.warning) setRecommendationNotice(refined.warning)
    setLoadingRecommend(false)
  }

  const reroll = async () => {
    if (mainResult) setExcludedCombos((prev) => [...prev, mainResult.plan.cities])
    await doGenerate(false)
  }

  const applyEditedRoute = (nextCityIds: string[], nextTotalDays?: number, nextSourceMap?: Record<string, 'mandatory' | 'recommended'>) => {
    if (!mainResult) return
    const fallbackSourceMap = mainResult.plan.route.reduce<Record<string, 'mandatory' | 'recommended'>>((acc, stop) => {
      acc[stop.cityId] = stop.sourceType ?? 'recommended'
      return acc
    }, {})
    const result = buildPlanFromOrderedCities(
      nextCityIds.map((id) => cityMap.get(id)).filter((item): item is SchengenCity => Boolean(item)),
      nextTotalDays ?? mainResult.plan.totalDays,
      travelStyle,
      budgetLevel,
      departureCity,
      nextSourceMap ?? fallbackSourceMap,
    )
    if (!result) {
      setRecommendationNotice('暂无合适推荐')
      return
    }
    setMainResult(result)
    setItinerary(result.plan.itinerary)
    setRecommendationNotice('路线已更新')
    setSwapIndex(null)
    setInsertBetween(null)
  }

  const openSwapForIndex = (index: number) => {
    if (!mainResult) return
    const target = mainResult.plan.route[index]
    if (!target) return
    if (target.sourceType === 'mandatory') {
      setRecommendationNotice('该城市是你指定的必去城市，不能直接替换。可改为插入或移除。')
      return
    }
    const prev = index > 0 ? mainResult.plan.route[index - 1] : undefined
    const next = index < mainResult.plan.route.length - 1 ? mainResult.plan.route[index + 1] : undefined
    const list = getAlternativeCities(
      target.cityId,
      prev?.cityId,
      next?.cityId,
      mainResult.plan.totalDays,
      mainResult.plan.route.map((item) => item.cityId),
    )
    setSwapCandidates(list)
    setSwapIndex(index)
  }

  const refreshSwapCandidates = () => {
    if (swapIndex === null || !mainResult) return
    const target = mainResult.plan.route[swapIndex]
    if (!target) return
    const prev = swapIndex > 0 ? mainResult.plan.route[swapIndex - 1] : undefined
    const next = swapIndex < mainResult.plan.route.length - 1 ? mainResult.plan.route[swapIndex + 1] : undefined
    const nextBatch = getAlternativeCities(
      target.cityId,
      prev?.cityId,
      next?.cityId,
      mainResult.plan.totalDays,
      mainResult.plan.route.map((item) => item.cityId),
    )
    setSwapCandidates(nextBatch.sort(() => Math.random() - 0.5))
  }

  const handleSwapCity = (newCityId: string) => {
    if (swapIndex === null || !mainResult) return
    const oldId = mainResult.plan.route[swapIndex]?.cityId
    if (!oldId) return
    const next = swapCity(mainResult.plan.route.map((item) => item.cityId), oldId, newCityId)
    const sourceMap = mainResult.plan.route.reduce<Record<string, 'mandatory' | 'recommended'>>((acc, stop) => {
      if (stop.cityId === oldId) acc[newCityId] = stop.sourceType ?? 'recommended'
      else acc[stop.cityId] = stop.sourceType ?? 'recommended'
      return acc
    }, {})
    applyEditedRoute(next, mainResult.plan.totalDays, sourceMap)
  }

  const handleRemoveCity = (index: number) => {
    if (!mainResult) return
    const target = mainResult.plan.route[index]
    if (!target) return
    const decision = window.prompt(`移除 ${cityMap.get(target.cityId)?.nameZh ?? target.cityId} 后：输入 A=缩短行程，B=把天数分给其他城市，C=插入新城市替代`, 'A')
    const mode = (decision ?? 'A').trim().toUpperCase()
    if (mode === 'C') {
      openSwapForIndex(index)
      return
    }
    const baseRouteIds = mainResult.plan.route.map((item) => item.cityId)
    const nextRouteIds = removeCity(baseRouteIds, target.cityId)
    const nextSourceMap = mainResult.plan.route.reduce<Record<string, 'mandatory' | 'recommended'>>((acc, stop) => {
      if (stop.cityId !== target.cityId) acc[stop.cityId] = stop.sourceType ?? 'recommended'
      return acc
    }, {})
    const nextTotalDays = mode === 'A'
      ? Math.max(1, mainResult.plan.totalDays - (target.days ?? 1))
      : mainResult.plan.totalDays
    applyEditedRoute(nextRouteIds, nextTotalDays, nextSourceMap)
  }

  const handleOpenInsert = (prevId: string, nextId: string, atIndex: number) => {
    setInsertBetween({ prevId, nextId, atIndex })
  }

  const handleInsertCity = (cityId: string, assignDays: number, mode: 'increase' | 'redistribute') => {
    if (!mainResult || !insertBetween) return
    const routeIds = mainResult.plan.route.map((item) => item.cityId)
    const inserted = insertCity(routeIds, cityId, insertBetween.atIndex)
    const sourceMap = mainResult.plan.route.reduce<Record<string, 'mandatory' | 'recommended'>>((acc, stop) => {
      acc[stop.cityId] = stop.sourceType ?? 'recommended'
      return acc
    }, {})
    sourceMap[cityId] = 'recommended'
    const nextTotalDays = mode === 'increase'
      ? mainResult.plan.totalDays + assignDays
      : Math.max(1, mainResult.plan.totalDays)
    applyEditedRoute(inserted, nextTotalDays, sourceMap)
  }

  const handleExportPdf = async () => {
    if (!mainResult || !exportContainerRef.current || exportState === 'loading') return
    setExportState('loading')
    await new Promise((resolve) => window.setTimeout(resolve, 80))

    const depName = departureCity === 'london' ? '伦敦' : (cityMap.get(departureCity)?.nameZh ?? departureCity)
    const routeNames = mainResult.plan.route.map((stop) => cityMap.get(stop.cityId)?.nameZh ?? stop.cityId).join(' → ')
    const dateRange = planStartDate
      ? (() => {
          const start = new Date(planStartDate)
          const end = new Date(start)
          end.setDate(start.getDate() + mainResult.plan.totalDays - 1)
          return `${planStartDate} 至 ${end.toISOString().slice(0, 10)}`
        })()
      : `${mainResult.plan.totalDays}天行程`

    const fileDate = new Date().toISOString().slice(0, 10)
    const fileName = `行程规划_${mainResult.plan.name}_${fileDate}.pdf`

    try {
      await exportItineraryPDF(exportContainerRef.current, fileName, {
        title: `${depName} → ${routeNames}`,
        subtitle: dateRange,
      })
      setExportState('success')
      window.setTimeout(() => setExportState('idle'), 1800)
    } catch (error) {
      console.error('PDF 导出失败:', error)
      setRecommendationNotice('导出失败，请稍后重试')
      setExportState('idle')
    }
  }

  const excludeCity = (cityId: string) => {
    setExcludedCities((prev) => (prev.includes(cityId) ? prev : [...prev, cityId]))
    setRequiredCityIds((prev) => prev.filter((id) => id !== cityId))
    setTimeout(() => reroll(), 0)
  }

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setItinerary((prev) => {
      const oldIndex = prev.findIndex((item) => item.dayNumber === active.id)
      const newIndex = prev.findIndex((item) => item.dayNumber === over.id)
      if (oldIndex < 0 || newIndex < 0) return prev
      return arrayMove(prev, oldIndex, newIndex).map((day, index) => ({ ...day, dayNumber: index + 1 }))
    })
  }

  useEffect(() => {
    if (!mainResult || activeTab !== 'itinerary') return
    const run = async () => {
      setLoadingItinerary(true)
      setAiRenderStatus({ source: 'pending' })
      const routeInfo = `${mainResult.summary}\n${mainResult.plan.route
        .map((s, i) => `${i + 1}. ${cityMap.get(s.cityId)?.nameZh ?? s.cityId} ${s.days}天`)
        .join('\n')}`
      const localItinerary = mainResult.plan.itinerary
      const aiResult = await generateAiItinerary(routeInfo, localItinerary, travelStyle, settings.apiKey)
      console.log('[AI itinerary] result source:', aiResult.usedAi ? 'AI' : 'FALLBACK', aiResult)
      if (!aiResult.usedAi) {
        setRecommendationNotice(`AI 行程接口调用失败，已降级为基础模板（${aiResult.reason ?? 'UNKNOWN'}）`)
        setAiRenderStatus({ source: 'fallback', reason: aiResult.reason })
      } else {
        setAiRenderStatus({ source: 'ai' })
      }
      setItinerary(aiResult.itinerary)
      setLoadingItinerary(false)
    }
    run()
  }, [activeTab, mainResult, settings.apiKey, travelStyle])

  const trafficRows = useMemo(() => {
    if (!mainResult) return []
    return mainResult.routePath
      .slice(0, -1)
      .map((fromId, index) => {
        const toId = mainResult.routePath[index + 1]
        const from = cityMap.get(fromId)
        const to = cityMap.get(toId)
        if (!from || !to) return null
        const transit = getTransitOptions(fromId, toId, cityMap)
        return { from, to, method: transit.recommended }
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
  }, [mainResult])

  const totalTrafficHours = trafficRows.reduce((sum, row) => sum + parseDurationToHours(row.method.duration), 0)
  const totalTrafficCost = trafficRows.reduce((sum, row) => sum + row.method.estimatedCost, 0)
  const routeStayDays = useMemo(() => {
    if (!mainResult) return {}
    return mainResult.plan.route.reduce<Record<string, number>>((acc, stop) => {
      acc[stop.cityId] = stop.days
      return acc
    }, {})
  }, [mainResult])
  const routeTransitIcons = useMemo(() => {
    if (!mainResult) return {}
    return mainResult.plan.route.reduce<Record<string, string>>((acc, stop) => {
      if (stop.arrivalMethod) acc[stop.cityId] = iconMap[stop.arrivalMethod] ?? '🚄'
      return acc
    }, {})
  }, [mainResult])
  const autoUsedVisaDays = visitedCities.reduce((sum, item) => sum + (item.duration ?? 0), 0)
  const effectiveVisaUsedDays = visaInfo?.autoCountFromFootprints ? autoUsedVisaDays : (visaInfo?.usedDays ?? 0)
  const visaRemainingDays = typeof visaInfo?.allowedDays === 'number' ? visaInfo.allowedDays - effectiveVisaUsedDays : null
  const hasVisaCheckData = Boolean(visaInfo?.enabled && typeof visaInfo.allowedDays === 'number')

  useEffect(() => {
    if (!mainResult || !planStartDate) {
      setHolidayConflicts([])
      setDismissedHolidayAlertIds([])
      return
    }
    setHolidayConflicts(checkHolidaysForPlan(mainResult.plan, planStartDate))
    setDismissedHolidayAlertIds([])
  }, [mainResult, planStartDate])

  const visibleHolidayConflicts = holidayConflicts.filter(
    (item) => !dismissedHolidayAlertIds.includes(`${item.dayNumber}-${item.cityId}-${item.holidayName}`),
  )

  const plannerSummary = useMemo(() => {
    const style = styleMeta[travelStyle].title
    const depName = departureCity === 'london' ? '伦敦' : (cityMap.get(departureCity)?.nameZh ?? departureCity)
    const routeText = mainResult?.plan.route.map((item) => cityMap.get(item.cityId)?.nameZh ?? item.cityId).join('→')
      ?? (plannerMode === 'refine' && mandatoryCityIds.length
        ? mandatoryCityIds.map((id) => cityMap.get(id)?.nameZh ?? id).join('→')
        : '待生成')
    return `${style} · ${routeText} · ${days}天 · ${depName}出发`
  }, [departureCity, days, mainResult, mandatoryCityIds, plannerMode, travelStyle])

  useEffect(() => {
    if (!mainResult) {
      setSettingsCollapsed(false)
      return
    }
    window.setTimeout(() => {
      resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)
  }, [mainResult])

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-muted/60 bg-white/95 p-3 backdrop-blur dark:bg-dark-card/95">
        <AnimatePresence mode="wait" initial={false}>
          {mainResult && settingsCollapsed ? (
            <motion.div
              key="planner-summary"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-gray-800"
              onClick={() => setSettingsCollapsed(false)}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500 dark:text-slate-300">{plannerSummary}</p>
                <button
                  className="rounded-full px-3 py-1 text-xs text-white"
                  style={{ backgroundColor: '#7B9EAE' }}
                  onClick={(event) => {
                    event.stopPropagation()
                    setSettingsCollapsed(false)
                  }}
                >
                  展开修改
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="planner-settings"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <h1 className="font-title text-center text-2xl">你有几天假？让我帮你规划！</h1>
              <div className="flex flex-wrap justify-center gap-2">
                <button className={`rounded-full px-4 py-1.5 text-sm ${plannerMode === 'zero' ? 'bg-primary text-white' : 'border border-muted/60'}`} onClick={() => setPlannerMode('zero')}>帮我从零规划</button>
                <button className={`rounded-full px-4 py-1.5 text-sm ${plannerMode === 'refine' ? 'bg-primary text-white' : 'border border-muted/60'}`} onClick={() => setPlannerMode('refine')}>我有初步想法</button>
              </div>

              <div className="flex flex-wrap gap-2">
                {(Object.keys(styleMeta) as TravelStyle[]).map((style) => {
                  const active = style === travelStyle
                  const meta = styleMeta[style]
                  return (
                    <button
                      key={style}
                      title={`${meta.desc} · ${meta.pace}`}
                      className={`rounded-full px-3 py-1.5 text-xs ${active ? 'text-white' : 'border border-muted/60 text-slate-600 dark:text-slate-200'}`}
                      style={active ? { backgroundColor: '#7B9EAE' } : undefined}
                      onClick={() => setTravelStyle(style)}
                    >
                      {meta.icon} {meta.title}
                    </button>
                  )
                })}
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <label className="rounded-xl border border-muted/60 p-2 text-sm">
                  <p className="text-xs text-slate-500">天数</p>
                  <div className="mt-1 flex items-center gap-2">
                    <input type="range" min={1} max={30} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full" />
                    <input type="number" min={1} max={30} value={days} onChange={(e) => setDays(Math.min(30, Math.max(1, Number(e.target.value) || 1)))} className="w-14 rounded border border-muted/60 px-2 py-1 text-xs" />
                  </div>
                </label>
                <label className="rounded-xl border border-muted/60 p-2 text-sm">
                  <p className="text-xs text-slate-500">出发城市</p>
                  <select className="mt-1 w-full rounded border border-muted/60 px-2 py-1 text-sm" value={departureCity} onChange={(e) => setDepartureCity(e.target.value)}>
                    {departureOptions.map((id) => <option key={id} value={id}>{id === 'london' ? '伦敦' : cityMap.get(id)?.nameZh ?? id}</option>)}
                  </select>
                </label>
                <label className="rounded-xl border border-muted/60 p-2 text-sm">
                  <p className="text-xs text-slate-500">计划出发日期</p>
                  <input type="date" value={planStartDate} onChange={(event) => setPlanStartDate(event.target.value)} className="mt-1 w-full rounded border border-muted/60 px-2 py-1 text-sm" />
                </label>
              </div>

              <div className="rounded-xl border border-muted/60 p-2 text-sm">
                <p className="text-xs text-slate-500">旅行偏好（可多选）</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {preferenceTags.map((tag) => (
                    <button key={tag} className={`rounded-full px-3 py-1 text-xs ${selectedPreferences.includes(tag) ? 'bg-primary text-white' : 'bg-muted/35'}`} onClick={() => setSelectedPreferences((prev) => (prev.includes(tag) ? prev.filter((v) => v !== tag) : [...prev, tag]))}>{tag}</button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'budget', label: '穷游', range: '€50-100/天' },
                  { key: 'mid', label: '舒适', range: '€100-190/天' },
                  { key: 'luxury', label: '奢华', range: '€190+/天' },
                ].map((item) => (
                  <button key={item.key} title={item.range} className={`rounded-full px-3 py-1.5 text-xs ${budgetLevel === item.key ? 'bg-primary text-white' : 'border border-muted/60'}`} onClick={() => setBudgetLevel(item.key as 'budget' | 'mid' | 'luxury')}>{item.label}</button>
                ))}
                <button className={`rounded-full px-3 py-1.5 text-xs ${wishlistPriority ? 'bg-primary text-white' : 'border border-muted/60'}`} onClick={() => setWishlistPriority((v) => !v)}>
                  心愿单优先：{wishlistPriority ? '开' : '关'}
                </button>
              </div>

              {plannerMode === 'zero' && requiredCityIds.length ? (
                <p className="text-xs text-primary">必经城市：{requiredCityIds.map((id) => cityMap.get(id)?.nameZh ?? id).join(' · ')}</p>
              ) : null}

              {plannerMode === 'refine' ? (
                <div className="grid gap-2 lg:grid-cols-3">
                  <div className="lg:col-span-2 space-y-2 rounded-xl border border-muted/60 p-2">
                    <p className="text-sm font-medium">必去城市（可拖拽排序）</p>
                    <CityTagInput cities={allCities} value={mandatoryCityIds} onChange={setMandatoryCityIds} placeholder="搜索城市（中英文）" />
                  </div>
                  <div className="space-y-2 rounded-xl border border-muted/60 p-2 text-sm">
                    <label className="flex items-center justify-between rounded-lg bg-muted/20 px-2 py-1.5">
                      <span className="text-xs">补充连接城市</span>
                      <button className={`rounded-full px-2 py-1 text-xs ${fillConnections ? 'bg-primary text-white' : 'bg-muted/50'}`} onClick={() => setFillConnections((prev) => !prev)}>{fillConnections ? '开' : '关'}</button>
                    </label>
                    <button className="w-full rounded-lg border border-dashed border-primary/40 px-2 py-1.5 text-xs text-primary" onClick={() => setShowRefineMapPicker((prev) => !prev)}>
                      📍 在地图上选城市
                    </button>
                  </div>
                  <AnimatePresence>
                    {showRefineMapPicker ? (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="lg:col-span-3 overflow-hidden rounded-xl border border-muted/60 p-2">
                        <div className="max-h-[250px] overflow-hidden">
                          <SchengenMap visitedCityIds={visitedCityIds} highlightedCityIds={mandatoryCityIds} onCityClick={(cityId) => setMandatoryCityIds((prev) => (prev.includes(cityId) ? prev : [...prev, cityId]))} compact />
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-1">
                <button className="rounded-full bg-purple px-5 py-2 text-sm text-white hover:bg-purple/90 disabled:cursor-not-allowed disabled:opacity-60" disabled={loadingRecommend} onClick={() => (plannerMode === 'refine' ? doRefineGenerate() : doGenerate(false))}>{loadingRecommend ? '正在生成...' : plannerMode === 'refine' ? '帮我细化行程 ✨' : '生成旅行方案 ✨'}</button>
                {plannerMode === 'zero' ? (
                  <>
                    <button className="rounded-full bg-muted/40 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60" disabled={loadingRecommend} onClick={reroll}>换一批推荐</button>
                    <button className="rounded-full bg-secondary/25 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60" disabled={loadingRecommend} onClick={() => doGenerate(true)}>再来一套</button>
                  </>
                ) : null}
                {mainResult ? <button className="rounded-full bg-primary px-4 py-2 text-sm text-white" onClick={() => savePlan({ ...mainResult.plan, itinerary })}>保存方案</button> : null}
                {showRegenerateHint ? <button className="rounded-full bg-amber-100 px-4 py-2 text-sm text-amber-700" onClick={reroll}>天数已变化，点击重新生成</button> : null}
              </div>
              {recommendationNotice ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{recommendationNotice}</p> : null}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {mainResult ? (
        <section ref={resultSectionRef} className="space-y-3 rounded-2xl border border-muted/60 bg-white p-4 dark:bg-dark-card">
          <div className="no-pdf-hide flex justify-end">
            <button
              onClick={handleExportPdf}
              disabled={exportState === 'loading'}
              className="w-full rounded-lg px-4 py-2 text-sm text-white sm:w-auto disabled:opacity-70"
              style={{ backgroundColor: '#7B9EAE' }}
            >
              {exportState === 'loading' ? (
                <span className="inline-flex items-center gap-2"><span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />正在生成...</span>
              ) : exportState === 'success' ? (
                '导出成功 ✓'
              ) : (
                '导出 PDF'
              )}
            </button>
          </div>
          <div ref={exportContainerRef} className="rounded-xl bg-[#FAF8F5] p-2 dark:bg-[#FAF8F5]">
          <div className="flex gap-2 text-sm">
            {['map', 'itinerary', 'inspiration'].map((tab) => (
              <button key={tab} className={`no-pdf-hide rounded-full px-3 py-1 ${activeTab === tab ? 'bg-primary text-white' : 'bg-muted/40'}`} onClick={() => setActiveTab(tab as 'map' | 'itinerary' | 'inspiration')}>
                {tab === 'map' ? '路线地图' : tab === 'itinerary' ? '逐日行程' : '灵感参考'}
              </button>
            ))}
          </div>

          {activeTab === 'map' ? (
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="lg:col-span-2"><SchengenMap visitedCityIds={visitedCityIds} highlightedCityIds={mainResult.routePath} routePath={[departureCity, ...mainResult.routePath]} wishlistCityIds={wishlist} cityStayDays={routeStayDays} cityTransitIcons={routeTransitIcons} /></div>
              <div className="space-y-2">
                <div data-pdf-card="true" className="rounded-xl bg-background/70 p-3 text-sm">
                  <p>{mainResult.summary}</p>
                  {hasVisaCheckData && visaRemainingDays !== null ? (
                    <div className="mt-2 space-y-1 text-xs">
                      {effectiveVisaUsedDays + mainResult.plan.totalDays <= (visaInfo?.allowedDays ?? 0) ? (
                        <p className="rounded bg-emerald-50 px-2 py-1 text-emerald-700">
                          ✓ 在签证允许范围内（行后剩余 {(visaInfo?.allowedDays ?? 0) - (effectiveVisaUsedDays + mainResult.plan.totalDays)} 天）
                        </p>
                      ) : (
                        <p className="rounded bg-amber-50 px-2 py-1 text-amber-700">
                          ⚠️ 此行程共 {mainResult.plan.totalDays} 天，加上已用 {effectiveVisaUsedDays} 天将超出签证允许的 {visaInfo?.allowedDays} 天。建议缩短至 {Math.max(0, (visaInfo?.allowedDays ?? 0) - effectiveVisaUsedDays)} 天以内
                        </p>
                      )}
                      {planStartDate && visaInfo?.visaEndDate ? (
                        (() => {
                          const start = new Date(planStartDate)
                          const end = new Date(start)
                          end.setDate(start.getDate() + mainResult.plan.totalDays - 1)
                          const visaEnd = new Date(visaInfo.visaEndDate)
                          return end.getTime() > visaEnd.getTime() ? (
                            <p className="rounded bg-amber-50 px-2 py-1 text-amber-700">⚠️ 行程结束日期超出签证有效期</p>
                          ) : null
                        })()
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {mainResult.plan.route.map((stop, index) => {
                  const city = cityMap.get(stop.cityId)
                  if (!city) return null
                  return (
                    <div key={`${stop.cityId}-${index}`} data-pdf-card="true" className="rounded-xl border border-muted/50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{index + 1}. {city.flag} {city.nameZh}</p>
                        <div className="flex flex-wrap items-center gap-1">
                          {stop.sourceType === 'mandatory' ? (
                            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] text-primary">📌 指定</span>
                          ) : null}
                          {stop.sourceType === 'recommended' ? (
                            <span className="rounded-full bg-purple/15 px-2 py-0.5 text-[11px] text-purple">🔗 系统推荐</span>
                          ) : null}
                          {stop.sourceType !== 'mandatory' ? (
                            <button className="no-pdf-hide rounded-full bg-muted/35 px-2 py-0.5 text-[11px]" onClick={() => openSwapForIndex(index)}>🔄 换一个</button>
                          ) : (
                            <button className="no-pdf-hide rounded-full bg-muted/35 px-2 py-0.5 text-[11px]" onClick={() => {
                              const nextDays = Number(window.prompt(`调整 ${city.nameZh} 停留天数`, String(stop.days)))
                              if (!Number.isFinite(nextDays) || nextDays <= 0 || !mainResult) return
                              const nextTotalDays = Math.max(1, mainResult.plan.totalDays - stop.days + Math.round(nextDays))
                              applyEditedRoute(mainResult.plan.route.map((item) => item.cityId), nextTotalDays)
                            }}>调整天数</button>
                          )}
                          <button className="no-pdf-hide rounded-full bg-red-100 px-2 py-0.5 text-[11px] text-red-600" onClick={() => handleRemoveCity(index)}>✕ 移除</button>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">停留 {stop.days} 天</p>
                      <div className="mt-2"><BudgetReference budgetPerDay={city.budgetPerDay} days={stop.days} /></div>
                      {swapIndex === index ? (
                        <div className="no-pdf-hide mt-2">
                          <SwapCityPanel
                            cityName={city.nameZh}
                            candidates={swapCandidates}
                            onSwap={handleSwapCity}
                            onRefresh={refreshSwapCandidates}
                            onClose={() => setSwapIndex(null)}
                          />
                        </div>
                      ) : null}
                      {index < mainResult.plan.route.length - 1 ? (
                        <div className="mt-2">
                          <button
                            className="no-pdf-hide rounded-full border border-dashed border-primary/40 px-3 py-1 text-xs text-primary"
                            onClick={() => handleOpenInsert(stop.cityId, mainResult.plan.route[index + 1].cityId, index + 1)}
                          >
                            + 插入一站
                          </button>
                          {insertBetween?.atIndex === index + 1 && insertBetween.prevId === stop.cityId ? (
                            <div className="no-pdf-hide mt-2">
                              <InsertCityPanel
                                candidates={getInsertCandidates(stop.cityId, mainResult.plan.route[index + 1].cityId, mainResult.plan.route.map((item) => item.cityId))}
                                allCities={allCities}
                                existingCityIds={mainResult.plan.route.map((item) => item.cityId)}
                                onInsert={handleInsertCity}
                                onClose={() => setInsertBetween(null)}
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      <button className="no-pdf-hide mt-2 text-xs text-red-500" onClick={() => excludeCity(stop.cityId)}>排除此城市</button>
                    </div>
                  )
                })}

                <div data-pdf-card="true" className="rounded-xl border border-muted/50 p-3 text-xs">
                  <p className="mb-2 font-medium">交通一览</p>
                  <table className="w-full text-left"><thead><tr><th>区间</th><th>方式</th><th>时长</th><th>费用</th></tr></thead><tbody>{trafficRows.map((row, idx) => <tr key={`${row.from.id}-${row.to.id}-${idx}`}><td>{row.from.nameZh}→{row.to.nameZh}</td><td>{iconMap[row.method.type] ?? '🚄'} {row.method.name ?? row.method.type}</td><td>{row.method.duration}</td><td>{row.method.costRange ?? `€${row.method.estimatedCost}`}</td></tr>)}</tbody></table>
                  <p className="mt-2">总交通时间约 {totalTrafficHours.toFixed(1)}h · 总交通费用约 €{totalTrafficCost}</p>
                </div>

                <div data-pdf-card="true" className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">总预算估算：交通 €{mainResult.plan.totalBudget.transit} + 住宿 €{mainResult.plan.totalBudget.accommodation} + 餐饮 €{mainResult.plan.totalBudget.food} + 活动 €{mainResult.plan.totalBudget.activities} = 总计 €{mainResult.plan.totalBudget.total}</div>
              </div>
            </div>
          ) : null}

          {activeTab === 'itinerary' ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {loadingItinerary ? <p className="text-sm text-slate-500">正在生成逐日行程...</p> : null}
                {aiRenderStatus?.source === 'ai' ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs text-emerald-700">AI 已启用</span>
                ) : null}
                {aiRenderStatus?.source === 'fallback' ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-700">已降级基础模板（{aiRenderStatus.reason ?? 'UNKNOWN'}）</span>
                ) : null}
                {aiRenderStatus?.source === 'pending' && !loadingItinerary ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">AI 状态检测中</span>
                ) : null}
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={itinerary.map((item) => item.dayNumber)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {itinerary.map((day, index) => {
                      const city = cityMap.get(day.cityId)
                      if (!city) return null
                      const prev = index > 0 ? itinerary[index - 1] : null
                      const prevCity = prev ? cityMap.get(prev.cityId) : null
                      const changed = Boolean(prevCity && prevCity.id !== city.id)
                      const transit = changed && prevCity ? getTransitOptions(prevCity.id, city.id, cityMap) : null
                      const rec = transit?.recommended
                      const firstDayInCity = !prev || prev.cityId !== city.id
                      const cityTotalDays = itinerary.filter((item) => item.cityId === city.id).length
                      const showDayTripSuggestion = firstDayInCity && cityTotalDays >= 3 && city.dayTrips.length > 0
                      const dayDate = planStartDate
                        ? (() => {
                            const d = new Date(planStartDate)
                            d.setDate(d.getDate() + day.dayNumber - 1)
                            return d.toISOString().slice(0, 10)
                          })()
                        : undefined
                      const dayConflicts = visibleHolidayConflicts.filter((item) => item.dayNumber === day.dayNumber)

                      return (
                        <div key={day.dayNumber} data-pdf-card="true" className="space-y-3">
                          {changed && prevCity ? (
                            <div className="space-y-2">
                              <TransitCard
                                fromCity={prevCity}
                                toCity={city}
                                cityMap={cityMap}
                                onInsertStation={() => handleOpenInsert(prevCity.id, city.id, index)}
                              />
                              {insertBetween?.atIndex === index && insertBetween.prevId === prevCity.id && insertBetween.nextId === city.id ? (
                                <div className="no-pdf-hide">
                                  <InsertCityPanel
                                    candidates={getInsertCandidates(prevCity.id, city.id, mainResult.plan.route.map((item) => item.cityId))}
                                    allCities={allCities}
                                    existingCityIds={mainResult.plan.route.map((item) => item.cityId)}
                                    onInsert={handleInsertCity}
                                    onClose={() => setInsertBetween(null)}
                                  />
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                          {dayConflicts.map((conflict) => {
                            const alertId = `${conflict.dayNumber}-${conflict.cityId}-${conflict.holidayName}`
                            return (
                              <div key={alertId} data-pdf-card="true" className="flex items-start justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                <p>⚠️ {conflict.date} 是 {city.countryZh} 的 {conflict.holidayName}，{conflict.impact}</p>
                                <button className="no-pdf-hide" onClick={() => setDismissedHolidayAlertIds((prev) => [...prev, alertId])}>×</button>
                              </div>
                            )
                          })}
                          <SortableDayItem
                            day={day}
                            city={city}
                            dateLabel={dayDate ? `${dayDate} · Day ${day.dayNumber}` : undefined}
                            travelStyle={travelStyle}
                            transitBadge={changed && prevCity && rec ? { icon: iconMap[rec.type] ?? '🚄', text: `${rec.name ?? rec.type} · ${rec.duration}`, morningText: `上午从${prevCity.nameZh}出发，${rec.name ?? rec.type}${rec.duration}抵达${city.nameZh}` } : undefined}
                            stayRecommendation={firstDayInCity ? city.stayAreas[0] : undefined}
                            showStayComparison={firstDayInCity}
                            arrivalTransportTip={firstDayInCity ? city.localTransport : undefined}
                            onChange={(next) => setItinerary((prevList) => prevList.map((item) => (item.dayNumber === day.dayNumber ? next : item)))}
                            hideActions={exportState === 'loading'}
                          />
                          {showDayTripSuggestion ? <DayTripSuggestionCard city={city} /> : null}
                        </div>
                      )
                    })}
                  </div>
                </SortableContext>
              </DndContext>
              {visibleHolidayConflicts.length ? (
                <div data-pdf-card="true" className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
                  <button className="no-pdf-hide flex w-full items-center justify-between text-left" onClick={() => setShowHolidayPanel((prev) => !prev)}>
                    <span className="text-sm font-medium">节假日提醒（{visibleHolidayConflicts.length}）</span>
                    <span className="text-xs">{showHolidayPanel ? '▲' : '▼'}</span>
                  </button>
                  {showHolidayPanel ? (
                    <div className="mt-2 space-y-2 text-xs">
                      {visibleHolidayConflicts.map((item) => {
                        const city = cityMap.get(item.cityId)
                        return (
                          <div key={`${item.dayNumber}-${item.cityId}-${item.holidayName}`} className="rounded-lg bg-white/80 p-2 dark:bg-dark-card">
                            <p>{item.date} · {city?.nameZh ?? item.cityId} · {item.holidayName}</p>
                            <p className="mt-1 text-slate-600 dark:text-slate-300">影响：{item.impact}</p>
                            <p className="mt-1 text-amber-700">建议：热门馆提前预约，室外活动放在上午，保留替代室内方案</p>
                          </div>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTab === 'inspiration' ? (
            <div className="space-y-3">
              <p className="rounded-xl bg-warm/70 p-3 text-sm">在做最终决定前，看看别人怎么玩的吧！</p>
              {mainResult.selectedCities.map((city) => <div key={city.id} className="rounded-xl border border-muted/60 p-3"><p className="font-medium">{city.flag} {city.nameZh}</p><p className="mb-2 text-xs text-slate-500">推荐理由：{city.highlights[0]}</p><InspirationLinks name={city.name} nameZh={city.nameZh} country={city.country} /></div>)}
            </div>
          ) : null}
          </div>
        </section>
      ) : <section className="rounded-2xl border border-dashed border-muted/70 bg-white/70 p-10 text-center text-sm text-slate-500 dark:bg-dark-card/70">还没有生成方案。先设置参数，然后点击“生成旅行方案 ✨”。</section>}

      {(mainResult ? 1 : 0) + altResults.length >= 2 ? (
        <section className="space-y-2 rounded-2xl border border-muted/60 bg-white p-4 dark:bg-dark-card">
          <h3 className="text-sm font-medium">方案对比</h3>
          <PlanComparison plans={[...(mainResult ? [mainResult.plan] : []), ...altResults.map((item) => item.plan)].slice(0, 3)} onSelectPlan={(planId) => { const found = [mainResult, ...altResults].find((item) => item?.plan.id === planId); if (found) { setMainResult(found); setItinerary(found.plan.itinerary); setTravelStyle(found.plan.travelStyle) } }} />
        </section>
      ) : null}

      {showSettingsModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 dark:bg-dark-card">
            <h3 className="text-lg font-semibold">AI 行程生成设置</h3>
            <p className="mt-2 text-sm text-slate-500">本站已内置 AI 能力，无需配置即可使用。如需使用自己的 OpenAI Key（享受更快速度），可在下方填入。</p>
            <input type="password" value={apiKeyDraft} onChange={(e) => setApiKeyDraft(e.target.value)} className="mt-3 w-full rounded-xl border border-muted/60 px-3 py-2 text-sm" placeholder="OpenAI API Key（可选）" />
            <p className="mt-1 text-xs text-slate-500">未填写时使用站点公共额度，填写后优先使用你自己的 Key</p>
            <div className="mt-4 flex items-center justify-between">
              <button className="rounded-full bg-primary px-4 py-1.5 text-sm text-white" onClick={() => { updateSettings({ apiKey: apiKeyDraft.trim() || undefined }); localStorage.setItem('smart-planner-api-guide-seen', '1'); setShowSettingsModal(false) }}>保存</button>
              <button className="text-sm text-slate-500 underline" onClick={() => { localStorage.setItem('smart-planner-api-guide-seen', '1'); setShowSettingsModal(false) }}>跳过，使用基础版</button>
            </div>
            <div className="mt-4">
              <VisaInfoSettings />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
