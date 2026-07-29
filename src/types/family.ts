export type MemberType = 'adult' | 'child'
export type Appetite = 'low' | 'moderate' | 'high'

export const RESTRICTIONS = [
  { id: 'gluten_free',  label: 'Sem glúten' },
  { id: 'lactose_free', label: 'Sem lactose' },
  { id: 'vegetarian',   label: 'Vegetariano' },
  { id: 'vegan',        label: 'Vegano' },
  { id: 'no_pork',      label: 'Sem porco' },
  { id: 'no_seafood',   label: 'Sem frutos do mar' },
  { id: 'diabetic',     label: 'Diabético' },
  { id: 'hypertensive', label: 'Hipertenso' },
] as const

export type RestrictionId = typeof RESTRICTIONS[number]['id']

export interface FamilyMember {
  id: string
  name: string
  type: MemberType
  appetite: Appetite
  restrictions: RestrictionId[]
  objectives: string[]
  calorie_limit_kcal?: number | null
}

export interface FamilyProfile {
  id: string
  user_id: string
  members: FamilyMember[]
  weekly_budget_brl: number | null
  created_at: string
  updated_at: string
}

export const APPETITE_LABELS: Record<Appetite, string> = {
  low:      'Pouco',
  moderate: 'Moderado',
  high:     'Muito',
}

export const TYPE_LABELS: Record<MemberType, string> = {
  adult: 'Adulto',
  child: 'Criança',
}
