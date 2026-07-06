import { supabase } from '../lib/supabase'
import type { FamilyMember, FamilyProfile } from '../types/family'

export async function fetchFamilyProfile(userId: string): Promise<FamilyProfile | null> {
  const { data, error } = await supabase
    .from('family_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data as FamilyProfile | null
}

export async function saveFamilyProfile(
  userId: string,
  members: FamilyMember[],
  weeklyBudget: number | null,
  profileId?: string,
): Promise<FamilyProfile> {
  const payload = { members, weekly_budget_brl: weeklyBudget }
  if (profileId) {
    const { data, error } = await supabase
      .from('family_profiles')
      .update(payload)
      .eq('id', profileId)
      .select()
      .single()
    if (error) throw error
    return data as FamilyProfile
  }
  const { data, error } = await supabase
    .from('family_profiles')
    .insert({ user_id: userId, ...payload })
    .select()
    .single()
  if (error) throw error
  return data as FamilyProfile
}
