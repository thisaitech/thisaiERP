import { useState, useEffect } from 'react'
import { PlanType, PLAN_CONFIG, SubscriptionPlan } from '../types'

// For now, we'll default to Silver plan
// In a real app, this would come from user authentication/database
const CURRENT_PLAN: PlanType = 'silver'

export const usePlan = () => {
  const [currentPlan, setCurrentPlan] = useState<PlanType>(CURRENT_PLAN)
  const [planConfig, setPlanConfig] = useState<SubscriptionPlan>(PLAN_CONFIG[CURRENT_PLAN])

  useEffect(() => {
    setPlanConfig(PLAN_CONFIG[currentPlan])
  }, [currentPlan])

  const hasFeature = (feature: keyof typeof planConfig.features): boolean => {
    return planConfig.features[feature]
  }

  const isGoldPlan = currentPlan === 'gold'
  const isSilverPlan = currentPlan === 'silver'

  return {
    currentPlan,
    planConfig,
    hasFeature,
    isGoldPlan,
    isSilverPlan,
  }
}
