export interface HolidayItem {
  date: string
  name: string
  impact: string
}

export interface CountryHolidayInfo {
  holidays: HolidayItem[]
  closureNotes: string[]
}

export type HolidayMap = Record<string, CountryHolidayInfo>

export interface HolidayConflict {
  date: string
  dayNumber: number
  cityId: string
  countryCode: string
  holidayName: string
  impact: string
}
