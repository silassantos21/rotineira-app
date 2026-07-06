import { Redirect, Stack } from 'expo-router'
import { useAuthStore } from '../../src/store/auth'

export default function AuthLayout() {
  const { session, isLoading } = useAuthStore()

  if (!isLoading && session) {
    return <Redirect href="/(app)" />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
