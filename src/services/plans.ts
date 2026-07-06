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

export async function generatePlan(familyProfileId: string): Promise<WeeklyPlan> {
  return apiFetch<WeeklyPlan>('/api/v1/plans/generate', {
    method: 'POST',
    body: JSON.stringify({
      family_profile_id: familyProfileId,
      week_start: getNextMonday(),
    }),
  })
}

export async function getPlan(planId: string): Promise<WeeklyPlan> {
  return apiFetch<WeeklyPlan>(`/api/v1/plans/${planId}`)
}

export async function listPlans(): Promise<WeeklyPlan[]> {
  return apiFetch<WeeklyPlan[]>('/api/v1/plans')
}
