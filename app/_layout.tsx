import { useEffect } from 'react'
import { Linking } from 'react-native'
import { Slot } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import {
  useFonts,
  Nunito_300Light,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from '../src/lib/supabase'
import { useAuthStore } from '../src/store/auth'
import '../global.css'

async function handleAuthDeepLink(url: string) {
  try {
    const parsed = new URL(url)

    // Confirmação de e-mail: rotineira://?token_hash=...&type=signup
    const token_hash = parsed.searchParams.get('token_hash')
    const type = parsed.searchParams.get('type')
    if (token_hash && type) {
      await supabase.auth.verifyOtp({ token_hash, type: type as any })
      return
    }

    // OAuth PKCE callback (Google/Apple): rotineira://login?code=...
    const code = parsed.searchParams.get('code')
    if (code) {
      await supabase.auth.exchangeCodeForSession(code)
    }
  } catch {}
}

SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
})

export default function RootLayout() {
  const setSession = useAuthStore((s) => s.setSession)

  const [fontsLoaded, fontError] = useFonts({
    Nunito_300Light,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    // Captura deep link de confirmação de e-mail (rotineira://?token_hash=...&type=signup)
    Linking.getInitialURL().then((url) => { if (url) handleAuthDeepLink(url) })
    const linkSub = Linking.addEventListener('url', ({ url }) => handleAuthDeepLink(url))

    return () => {
      subscription.unsubscribe()
      linkSub.remove()
    }
  }, [])

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) return null

  return (
    <QueryClientProvider client={queryClient}>
      <Slot />
    </QueryClientProvider>
  )
}
