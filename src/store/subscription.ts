import { create } from 'zustand'
import { checkIsPremium } from '../services/revenue'

interface SubscriptionState {
  isPremium: boolean
  isLoading: boolean
  refresh: () => Promise<void>
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  isPremium: false,
  isLoading: false,
  refresh: async () => {
    set({ isLoading: true })
    const isPremium = await checkIsPremium()
    set({ isPremium, isLoading: false })
  },
}))
