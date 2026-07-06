export type PlanStatus = 'pending' | 'processing' | 'done' | 'error'

export interface MealPortion {
  protein_g: number
  carb_g: number
  vegetable_g: number
  total_g: number
}

export interface DailyMeal {
  day: string
  lunch: string
  portions: Record<string, MealPortion>
  prep_time_min: number
  cook_time_min: number
  utensils: string[]
  instructions: string[]
}

export interface ShoppingItem {
  name: string
  quantity: string
  category: string
  price_estimate_brl: number
  checked: boolean
}

export interface WeeklyPlan {
  id: string
  user_id: string
  family_profile_id: string
  week_start: string
  status: PlanStatus
  meals?: DailyMeal[]
  shopping_list?: ShoppingItem[]
  assembly_guide?: Record<string, unknown>
  error_message?: string
}

export const SHOPPING_CATEGORIES = [
  'AÇOUGUE',
  'HORTIFRUTI',
  'MERCEARIA',
  'LATICÍNIOS',
  'TEMPEROS',
] as const
