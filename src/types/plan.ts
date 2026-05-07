export type TravelStyle = 'speedrun' | 'balanced' | 'relaxed' | 'deep'

export interface TravelPlan {
  id: string
  name: string
  createdAt: string
  totalDays: number
  cities: string[]
  route: RouteStop[]
  itinerary: DayPlan[]
  totalBudget: BudgetEstimate
  status: 'draft' | 'confirmed' | 'completed'
  travelStyle: TravelStyle
}

export interface RouteStop {
  cityId: string
  days: number
  arrivalMethod?: string
  arrivalDuration?: string
  arrivalCost?: number
}

export interface DayPlan {
  dayNumber: number
  cityId: string
  morning: string
  afternoon: string
  evening: string
  restaurant?: string
  transitNote?: string
}

export interface BudgetEstimate {
  accommodation: number
  food: number
  transit: number
  activities: number
  total: number
  perDay: number
  level: 'budget' | 'mid' | 'luxury'
}
