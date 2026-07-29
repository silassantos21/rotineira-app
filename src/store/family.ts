import { create } from 'zustand'
import type { FamilyMember } from '../types/family'

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

interface FamilyDraftStore {
  profileId: string | null
  members: FamilyMember[]
  editingMember: FamilyMember | null
  editingIndex: number | null

  loadProfile(profileId: string | null, members: FamilyMember[]): void
  startAddMember(): void
  startEditMember(index: number): void
  commitMember(data: Omit<FamilyMember, 'id'>): void
  removeMember(index: number): void
}

export const useFamilyStore = create<FamilyDraftStore>((set, get) => ({
  profileId: null,
  members: [],
  editingMember: null,
  editingIndex: null,

  loadProfile(profileId, members) {
    set({ profileId, members, editingMember: null, editingIndex: null })
  },

  startAddMember() {
    set({
      editingMember: {
        id: genId(),
        name: '',
        type: 'adult',
        appetite: 'moderate',
        restrictions: [],
        objectives: [],
        calorie_limit_kcal: null,
      },
      editingIndex: null,
    })
  },

  startEditMember(index) {
    const members = get().members
    set({ editingMember: { ...members[index] }, editingIndex: index })
  },

  commitMember(data) {
    const { members, editingMember, editingIndex } = get()
    if (!editingMember) return
    const member: FamilyMember = { ...data, id: editingMember.id }
    if (editingIndex !== null) {
      const next = [...members]
      next[editingIndex] = member
      set({ members: next, editingMember: null, editingIndex: null })
    } else {
      set({ members: [...members, member], editingMember: null, editingIndex: null })
    }
  },

  removeMember(index) {
    set({ members: get().members.filter((_, i) => i !== index) })
  },
}))
