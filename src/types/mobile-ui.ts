export type MobileDensity = 'compact' | 'comfortable'
export type MotionLevel = 'balanced' | 'reduced'
export type ModuleScaffoldVariant = 'list' | 'dashboard' | 'form-heavy'

export interface MobileUIConfig {
  enabled: boolean
  density: MobileDensity
  motion: MotionLevel
}

