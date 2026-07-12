import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { apiFetch } from '../lib/apiClient'

// Push remoto foi removido do Expo Go no SDK 53 — só funciona em builds nativas
export const isExpoGo =
  Constants.appOwnership === 'expo' ||
  (Constants.executionEnvironment as string) === 'storeClient'

export async function registerPushToken(): Promise<void> {
  if (Platform.OS === 'web' || isExpoGo) return

  try {
    const Notifications = await import('expo-notifications')

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    })

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') return

    const projectId =
      (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
      (Constants.easConfig as { projectId?: string } | undefined)?.projectId

    if (!projectId) return

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId })

    await apiFetch('/api/v1/notifications/token', {
      method: 'POST',
      body: JSON.stringify({ token: tokenData.data }),
    })
  } catch {
    // Push não disponível neste ambiente
  }
}

// Retorna uma função de cleanup. Chame no useEffect de _layout.tsx.
export function setupNotificationListener(onPlanReady: (planId: string) => void): () => void {
  if (isExpoGo) return () => {}

  let subscription: { remove: () => void } | null = null

  import('expo-notifications').then((Notifications) => {
    subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const planId = response.notification.request.content.data?.plan_id as string | undefined
      if (planId) onPlanReady(planId)
    })
  })

  return () => subscription?.remove()
}
