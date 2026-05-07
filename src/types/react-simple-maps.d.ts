declare module 'react-simple-maps' {
  import type { ComponentType, ReactNode, CSSProperties } from 'react'

  export const ComposableMap: ComponentType<{
    children?: ReactNode
    projection?: string
    projectionConfig?: Record<string, unknown>
    width?: number
    height?: number
    style?: CSSProperties
  }>

  export const Geographies: ComponentType<{
    geography: string | object
    children: (args: {
      geographies: any[]
      projection: (coordinates: [number, number]) => [number, number] | null
    }) => ReactNode
  }>

  export const Geography: ComponentType<{
    geography: any
    fill?: string
    stroke?: string
    strokeWidth?: number
    className?: string
    style?: Record<string, unknown>
    onClick?: (event?: unknown) => void
    children?: ReactNode
  }>

  export const Marker: ComponentType<{
    coordinates: [number, number]
    children?: ReactNode
  }>

  export const ZoomableGroup: ComponentType<{
    center?: [number, number]
    zoom?: number
    minZoom?: number
    maxZoom?: number
    onMoveEnd?: (position: { coordinates: [number, number]; zoom: number }) => void
    disablePanning?: boolean
    disableZoom?: boolean
    children?: ReactNode | ((args: { projection: (coordinates: [number, number]) => [number, number] | null }) => ReactNode)
  }>
}
