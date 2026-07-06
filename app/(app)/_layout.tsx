import { useEffect } from 'react'
import { Redirect, Stack } from 'expo-router'
import { Text } from 'react-native'
import { useAuthStore } from '../../src/store/auth'
import { colors } from '../../src/theme/colors'
import { textStyles } from '../../src/theme/typography'
import { registerPushToken } from '../../src/services/notifications'

export default function AppLayout() {
  const { session, isLoading } = useAuthStore()

  useEffect(() => {
    if (session) {
      registerPushToken().catch(() => {})
    }
  }, [!!session])

  if (!isLoading && !session) {
    return <Redirect href="/(auth)/login" />
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background.header },
        headerTintColor: colors.text.inverse,
        headerTitleStyle: textStyles.h3 as any,
        contentStyle: { backgroundColor: colors.background.screen },
        // Nome do app no header em texto (logo tem fundo sólido #FCF2E8)
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
