import { useEffect, useState } from 'react'
import { Redirect, Stack, router } from 'expo-router'
import { Text } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuthStore } from '../../src/store/auth'
import { colors } from '../../src/theme/colors'
import { textStyles } from '../../src/theme/typography'
import { registerPushToken, setupNotificationListener } from '../../src/services/notifications'
import { initRevenueCat } from '../../src/services/revenue'
import { useSubscriptionStore } from '../../src/store/subscription'
import { ONBOARDING_KEY } from '../onboarding'

export default function AppLayout() {
  const { session, isLoading } = useAuthStore()
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null)
  const { refresh: refreshSubscription } = useSubscriptionStore()

  useEffect(() => {
    if (!isLoading && session) {
      AsyncStorage.getItem(ONBOARDING_KEY).then((v) => setOnboardingDone(v === '1'))
    }
  }, [isLoading, session])

  useEffect(() => {
    if (!session || !onboardingDone) return

    const userId = session.user.id

    registerPushToken().catch(() => {})
    initRevenueCat(userId)
    refreshSubscription()

    const cleanup = setupNotificationListener((planId) => {
      router.push(`/plan?id=${planId}`)
    })
    return cleanup
  }, [!!session, onboardingDone])

  if (isLoading || (session && onboardingDone === null)) return null

  if (!session) return <Redirect href="/(auth)/login" />
  if (!onboardingDone) return <Redirect href="/onboarding" />

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background.header },
        headerTintColor: colors.text.inverse,
        headerTitleStyle: textStyles.h3 as any,
        contentStyle: { backgroundColor: colors.background.screen },
        headerTitle: () => (
          <Text
            style={{
              ...textStyles.appName,
              color: colors.text.inverse,
              letterSpacing: 3,
            }}
          >
            ROTINEIRA
          </Text>
        ),
      }}
    />
  )
}
