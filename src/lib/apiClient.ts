import { supabase } from './supabase'

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

export async function getAuthToken(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  if (!data.session?.access_token) throw new Error('Sessão expirada. Faça login novamente.')
  return data.session.access_token
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAuthToken()
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error((error as { detail?: string }).detail ?? `Erro ${response.status}`)
  }
  return response.json() as Promise<T>
}
