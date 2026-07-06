import * as ExpoNotifications from 'expo-notifications'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { apiFetch } from '../lib/apiClient'

ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function registerPushToken(): Promise<void> {
  if (Platform.OS === 'web') return

  const { status: existingStatus } = await ExpoNotifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await ExpoNotifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return

  const projectId =
    (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
    (Constants.easConfig as { projectId?: string } | undefined)?.projectId

  if (!projectId) return

  const tokenData = await ExpoNotifications.getExpoPushTokenAsync({ projectId })

  await apiFetch('/api/v1/notifications/token', {
    method: 'POST',
    body: JSON.stringify({ token: tokenData.data }),
  })
}
