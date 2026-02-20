import type { ReactNode } from 'react'

export interface MobilePageAction {
  id: string
  label: string
  icon?: ReactNode
  onClick: () => void
  disabled?: boolean
}

export interface MobileStatCardItem {
  id: string
  title: string
  value: string
  subtitle?: string
  icon?: ReactNode
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
  onClick?: () => void
}

export interface MobileFilterChipItem {
  id: string
  label: string
  count?: number
}

export interface MobileListCardField {
  id: string
  label: string
  value: ReactNode
}

export interface MobileActionItem {
  id: string
  label: string
  icon?: ReactNode
  onClick: () => void
  tone?: 'default' | 'danger'
}

