import { isExpoGo } from '../services/notifications'

// expo-speech-recognition não está disponível no Expo Go — requer development build.
// Este shim exporta no-ops quando isExpoGo=true, evitando crash silencioso.

const _noop = () => {}
const _noopAsync = async () => ({ granted: false, canAskAgain: false, status: 'denied' as const })

let _useSpeechEvent: (event: string, handler: (e: any) => void) => void = _noop
let _module: {
  requestPermissionsAsync: () => Promise<{ granted: boolean }>
  start: (opts: any) => void
  stop: () => void
} = { requestPermissionsAsync: _noopAsync, start: _noop, stop: _noop }

if (!isExpoGo) {
  try {
    const m = require('expo-speech-recognition')
    _useSpeechEvent = m.useSpeechRecognitionEvent
    _module = m.ExpoSpeechRecognitionModule
  } catch {}
}

export const useSpeechRecognitionEvent = _useSpeechEvent
export const ExpoSpeechRecognitionModule = _module
