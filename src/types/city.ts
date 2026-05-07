export interface SchengenCity {
  id: string
  name: string
  nameZh: string
  country: string
  countryZh: string
  countryCode: string
  flag: string
  lat: number
  lng: number
  bestMonths: number[]
  weather: {
    spring: SeasonWeather
    summer: SeasonWeather
    autumn: SeasonWeather
    winter: SeasonWeather
  }
  vibes: string[]
  highlights: string[]
  budgetPerDay: { budget: number; mid: number; luxury: number }
  avgDaysRecommended: number
  transitFromLondon: { method: string; duration: string; estimatedCost: number }
  dayTrips: DayTrip[]
  stayAreas: StayArea[]
  localTransport: LocalTransport
}

export interface SeasonWeather {
  avgTemp: number
  rainfall: string
  description: string
}

export interface DayTrip {
  name: string
  nameEn: string
  distance: string
  duration: string
  transport: string
  highlights: string
  recommendedHours: number
  bestFor: string[]
}

export interface StayArea {
  name: string
  description: string
  pros: string[]
  cons: string[]
  budgetRange: string
  bestFor: string
  nearbyAttractions: string[]
}

export interface LocalTransportTip {
  title: string
  content: string
}

export interface LocalTransportPass {
  name: string
  price: string
  includes: string
  worthIt: string
  link: string
}

export interface LocalTransport {
  overview: string
  tips: LocalTransportTip[]
  passes: LocalTransportPass[]
}

export interface TransitRoute {
  from: string
  to: string
  methods: TransitMethod[]
}

export interface TransitMethod {
  type: string
  duration: string
  estimatedCost: number
  recommended: boolean
  name?: string
  costRange?: string
}
