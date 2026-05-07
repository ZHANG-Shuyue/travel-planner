export interface CountryHighlight {
  name: string
  city: string
  type: string
}

export interface CountryCuisine {
  name: string
  description: string
}

export interface CountryCustom {
  title: string
  content: string
}

export interface CountryPhrase {
  local: string
  meaning: string
}

export interface CountryEtiquette {
  tipping: {
    restaurant: string
    cafe: string
    taxi: string
    hotel: string
    tour: string
  }
  customs: CountryCustom[]
  usefulPhrases: CountryPhrase[]
  emergencyNumber: string
}

export interface CountryInfo {
  name: string
  nameZh: string
  flag: string
  capital: string
  description: string
  highlights: CountryHighlight[]
  cuisine: CountryCuisine[]
  funFacts: string[]
  bestSeasons: string
  etiquette: CountryEtiquette
}

export type CountryInfoMap = Record<string, CountryInfo>
