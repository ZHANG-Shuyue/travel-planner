import type { TravelPlan } from './plan'

export interface UserData {
  visitedCities: VisitedCity[]
  wishlist: string[]
  savedPlans: TravelPlan[]
  settings: UserSettings
  countdown?: { date: string; destination: string }
  visaInfo?: VisaInfo
  customCities: CustomCity[]
}

export interface VisitedCity {
  cityId: string
  visitDate?: string
  duration?: number
  comment?: string
  rating?: number
}

export interface UserSettings {
  darkMode: boolean
  apiKey?: string
  defaultDepartureCity: string
}

export interface CustomCity {
  id: string
  name: string
  countryCode: string
  isCustom: true
}

export interface VisaInfo {
  enabled: boolean
  visaStartDate?: string
  visaEndDate?: string
  allowedDays?: number
  usedDays?: number
  autoCountFromFootprints: boolean
  notes?: string
}
