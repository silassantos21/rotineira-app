import { apiFetch } from '../lib/apiClient'
import type { WeeklyPlan } from '../types/plans'

export function getNextMonday(): string {
  const today = new Date()
  const day = today.getDay()
  const daysUntilMonday = day === 0 ? 1 : 8 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + daysUntilMonday)
  return monday.toISOString().split('T')[0]
}

export type PlanPeriod = 'weekly' | 'biweekly' | 'monthly'

export async function generatePlan(
  familyProfileId: string,
  period: PlanPeriod = 'weekly',
  includeBreakfast = false,
  includeDinner = false,
  includeDessert = false,
): Promise<WeeklyPlan> {
  return apiFetch<WeeklyPlan>('/api/v1/plans/generate', {
    method: 'POST',
    body: JSON.stringify({
      family_profile_id: familyProfileId,
      week_start: getNextMonday(),
      period,
      include_breakfast: includeBreakfast,
      include_dinner: includeDinner,
      include_dessert: includeDessert,
    }),
  })
}

export async function getPlan(planId: string): Promise<WeeklyPlan> {
  return apiFetch<WeeklyPlan>(`/api/v1/plans/${planId}`)
}

export async function listPlans(): Promise<WeeklyPlan[]> {
  return apiFetch<WeeklyPlan[]>('/api/v1/plans')
}

export async function adaptPlan(planId: string, feedback: string): Promise<WeeklyPlan> {
  return apiFetch<WeeklyPlan>(`/api/v1/plans/${planId}/adapt`, {
    method: 'POST',
    body: JSON.stringify({ feedback }),
  })
}
