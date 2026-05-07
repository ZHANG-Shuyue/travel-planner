import holidaysData from '../data/holidays.json'
import citiesData from '../data/schengen-cities.json'
import type { TravelPlan } from '../types/plan'
import type { HolidayConflict, HolidayMap } from '../types/holiday'
import type { SchengenCity } from '../types/city'

const holidayMap = holidaysData as HolidayMap
const cityMap = new Map((citiesData as SchengenCity[]).map((city) => [city.id, city]))

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10)
}

function toMonthDay(value: Date) {
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')
  return `${month}-${day}`
}

function isFixedDate(date: string) {
  return /^\d{2}-\d{2}$/.test(date)
}

export function checkHolidaysForPlan(plan: TravelPlan, startDate: string): HolidayConflict[] {
  const base = new Date(startDate)
  if (Number.isNaN(base.getTime())) return []

  const conflicts: HolidayConflict[] = []
  for (const day of plan.itinerary) {
    const city = cityMap.get(day.cityId)
    if (!city) continue
    const date = new Date(base)
    date.setDate(base.getDate() + day.dayNumber - 1)
    const monthDay = toMonthDay(date)
    const entries = holidayMap[city.countryCode]?.holidays ?? []
    entries
      .filter((item) => isFixedDate(item.date) && item.date === monthDay)
      .forEach((item) => {
        conflicts.push({
          date: formatDate(date),
          dayNumber: day.dayNumber,
          cityId: day.cityId,
          countryCode: city.countryCode,
          holidayName: item.name,
          impact: item.impact,
        })
      })
  }
  return conflicts
}

export function getClosureNotes(countryCode: string) {
  return holidayMap[countryCode]?.closureNotes ?? []
}

export function getCountryHolidays(countryCode: string) {
  return holidayMap[countryCode]?.holidays ?? []
}
