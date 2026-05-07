import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import citiesData from '../data/schengen-cities.json'
import countryInfoData from '../data/country-info.json'
import type { TravelPlan } from '../types/plan'
import type { SchengenCity } from '../types/city'
import type { CountryInfoMap } from '../types/country-info'
import type { CustomCity, UserData, UserSettings, VisaInfo, VisitedCity } from '../types/user'

interface UserStore extends UserData {
  toggleVisited: (cityId: string) => void
  updateVisitedCity: (cityId: string, data: Partial<VisitedCity>) => void
  addToWishlist: (cityId: string) => void
  removeFromWishlist: (cityId: string) => void
  savePlan: (plan: TravelPlan) => void
  deletePlan: (planId: string) => void
  updateSettings: (settings: Partial<UserSettings>) => void
  setVisaInfo: (info: Partial<VisaInfo>) => void
  clearVisaInfo: () => void
  getRemainingVisaDays: () => number | null
  getVisaExpired: () => boolean
  addCustomCity: (name: string, countryCode: string) => string
  updateCustomCity: (id: string, name: string) => void
  deleteCustomCity: (id: string) => void
  getAllCities: () => Array<SchengenCity | (Partial<SchengenCity> & CustomCity & { nameZh: string; countryZh: string; flag: string })>
  getVisitedCountryCount: () => number
  getCitiesByCountry: (countryCode: string) => Array<SchengenCity | (Partial<SchengenCity> & CustomCity & { nameZh: string; countryZh: string; flag: string })>
  setCountdown: (date: string, destination: string) => void
  getVisitedCityIds: () => string[]
  getUnvisitedCities: () => SchengenCity[]
  isInWishlist: (cityId: string) => boolean
}

const allCities = citiesData as SchengenCity[]
const countryInfo = countryInfoData as CountryInfoMap

const initialState: UserData = {
  visitedCities: [],
  wishlist: [],
  savedPlans: [],
  settings: {
    darkMode: false,
    defaultDepartureCity: 'London',
  },
  customCities: [],
  visaInfo: {
    enabled: false,
    autoCountFromFootprints: true,
  },
}

function calcAutoUsedDays(visitedCities: VisitedCity[]) {
  return visitedCities.reduce((sum, item) => sum + (item.duration ?? 0), 0)
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      toggleVisited: (cityId) => {
        set((state) => {
          const exists = state.visitedCities.some((item) => item.cityId === cityId)
          return {
            visitedCities: exists
              ? state.visitedCities.filter((item) => item.cityId !== cityId)
              : [...state.visitedCities, { cityId }],
          }
        })
      },

      updateVisitedCity: (cityId, data) => {
        set((state) => {
          const index = state.visitedCities.findIndex((item) => item.cityId === cityId)

          if (index === -1) {
            return {
              visitedCities: [...state.visitedCities, { cityId, ...data }],
            }
          }

          const nextVisited = [...state.visitedCities]
          nextVisited[index] = { ...nextVisited[index], ...data }
          return { visitedCities: nextVisited }
        })
      },

      addToWishlist: (cityId) => {
        set((state) => ({
          wishlist: state.wishlist.includes(cityId)
            ? state.wishlist
            : [...state.wishlist, cityId],
        }))
      },

      removeFromWishlist: (cityId) => {
        set((state) => ({
          wishlist: state.wishlist.filter((id) => id !== cityId),
        }))
      },

      savePlan: (plan) => {
        set((state) => {
          const exists = state.savedPlans.some((item) => item.id === plan.id)
          return {
            savedPlans: exists
              ? state.savedPlans.map((item) => (item.id === plan.id ? plan : item))
              : [...state.savedPlans, plan],
          }
        })
      },

      deletePlan: (planId) => {
        set((state) => ({
          savedPlans: state.savedPlans.filter((plan) => plan.id !== planId),
        }))
      },

      updateSettings: (settings) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ...settings,
          },
        }))
      },

      setVisaInfo: (info) => {
        set((state) => ({
          visaInfo: {
            enabled: false,
            autoCountFromFootprints: true,
            ...(state.visaInfo ?? {}),
            ...info,
          },
        }))
      },

      clearVisaInfo: () => {
        set({
          visaInfo: {
            enabled: false,
            autoCountFromFootprints: true,
          },
        })
      },

      getRemainingVisaDays: () => {
        const { visaInfo, visitedCities } = get()
        if (!visaInfo?.enabled || typeof visaInfo.allowedDays !== 'number') return null
        const used = visaInfo.autoCountFromFootprints
          ? calcAutoUsedDays(visitedCities)
          : (visaInfo.usedDays ?? 0)
        return visaInfo.allowedDays - used
      },

      getVisaExpired: () => {
        const { visaInfo } = get()
        if (!visaInfo?.enabled || !visaInfo.visaEndDate) return false
        const today = new Date()
        const end = new Date(visaInfo.visaEndDate)
        if (Number.isNaN(end.getTime())) return false
        return today.getTime() > end.getTime()
      },

      addCustomCity: (name, countryCode) => {
        const id = `custom-${Date.now()}`
        const city: CustomCity = {
          id,
          name: name.trim(),
          countryCode,
          isCustom: true,
        }
        set((state) => ({
          customCities: [...state.customCities, city],
          visitedCities: state.visitedCities.some((item) => item.cityId === id)
            ? state.visitedCities
            : [...state.visitedCities, { cityId: id }],
        }))
        return id
      },

      updateCustomCity: (id, name) => {
        set((state) => ({
          customCities: state.customCities.map((city) => (city.id === id ? { ...city, name: name.trim() } : city)),
        }))
      },

      deleteCustomCity: (id) => {
        set((state) => ({
          customCities: state.customCities.filter((city) => city.id !== id),
          visitedCities: state.visitedCities.filter((item) => item.cityId !== id),
        }))
      },

      getAllCities: () => {
        const custom = get().customCities.map((item) => {
          const country = countryInfo[item.countryCode]
          return {
            ...item,
            nameZh: item.name,
            country: country?.name ?? item.countryCode,
            countryZh: country?.nameZh ?? item.countryCode,
            flag: country?.flag ?? '🏳️',
          }
        })
        return [...allCities, ...custom]
      },

      getVisitedCountryCount: () => {
        const { visitedCities, customCities } = get()
        const customMap = new Map(customCities.map((city) => [city.id, city]))
        const codes = new Set<string>()
        visitedCities.forEach((item) => {
          const preset = allCities.find((city) => city.id === item.cityId)
          const custom = customMap.get(item.cityId)
          const code = preset?.countryCode ?? custom?.countryCode
          if (code) codes.add(code)
        })
        return codes.size
      },

      getCitiesByCountry: (countryCode) => {
        const preset = allCities.filter((city) => city.countryCode === countryCode)
        const custom = get().customCities
          .filter((city) => city.countryCode === countryCode)
          .map((item) => {
            const country = countryInfo[item.countryCode]
            return {
              ...item,
              nameZh: item.name,
              country: country?.name ?? item.countryCode,
              countryZh: country?.nameZh ?? item.countryCode,
              flag: country?.flag ?? '🏳️',
            }
          })
        return [...preset, ...custom]
      },

      setCountdown: (date, destination) => {
        set({ countdown: { date, destination } })
      },

      getVisitedCityIds: () => get().visitedCities.map((item) => item.cityId),

      getUnvisitedCities: () => {
        const visitedSet = new Set(get().visitedCities.map((item) => item.cityId))
        return allCities.filter((city) => !visitedSet.has(city.id))
      },

      isInWishlist: (cityId) => get().wishlist.includes(cityId),
    }),
    {
      name: 'schengen-user-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        visitedCities: state.visitedCities,
        wishlist: state.wishlist,
        savedPlans: state.savedPlans,
        settings: state.settings,
        countdown: state.countdown,
        visaInfo: state.visaInfo,
        customCities: state.customCities,
      }),
    },
  ),
)
