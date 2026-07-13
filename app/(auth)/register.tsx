import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Link, useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { colors } from '../../src/theme/colors'
import { textStyles, fontFamily } from '../../src/theme/typography'
import { spacing, radius } from '../../src/theme/spacing'
import { Input } from '../../src/components/ui/Input'
import { Button } from '../../src/components/ui/Button'
import { supabase } from '../../src/lib/supabase'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type PasswordStrength = { level: 0 | 1 | 2 | 3 | 4; label: string; color: string }

function getPasswordStrength(pwd: string): PasswordStrength {
  if (!pwd) return { level: 0, label: '', color: 'transparent' }
  let score = 0
  if (pwd.length >= 8) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  const map: PasswordStrength[] = [
    { level: 0, label: '', color: 'transparent' },
    { level: 1, label: 'Fraca', color: '#E53E3E' },
    { level: 2, label: 'Média', color: '#DD6B20' },
    { level: 3, label: 'Boa', color: '#D69E2E' },
    { level: 4, label: 'Forte', color: '#38A169' },
  ]
  return map[score] ?? map[1]
}

export default function RegisterScreen() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const strength = getPasswordStrength(password)

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!fullName.trim()) next.fullName = 'Nome é obrigatório.'
    if (!email.trim()) next.email = 'E-mail é obrigatório.'
    else if (!EMAIL_REGEX.test(email)) next.email = 'E-mail inválido.'
    if (!password) next.password = 'Senha é obrigatória.'
    else if (password.length < 8) next.password = 'Mínimo de 8 caracteres.'
    else if (strength.level < 2) next.password = 'Senha muito fraca. Adicione letras maiúsculas ou números.'
    if (!confirmPassword) next.confirmPassword = 'Confirme sua senha.'
    else if (password !== confirmPassword) next.confirmPassword = 'As senhas não coincidem.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleRegister() {
    if (!validate()) return
    setLoading(true)
    setSubmitError(null)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    })
    if (error) {
      setSubmitError(traduzeErro(error.message))
    } else if (data.session) {
      // TODO: confirmação por e-mail desativada temporariamente para testes.
      // Antes do lançamento: Supabase → Authentication → Providers → Email → ativar "Confirm email"
      // e remover este bloco (deixar apenas o else abaixo).
      router.replace('/(app)')
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Feather name="check" size={40} color={colors.brand.primary} />
          </View>
          <Text style={styles.successTitle}>Conta criada!</Text>
          <Text style={styles.successSubtitle}>
            Verifique seu e-mail para confirmar o cadastro e começar a usar o Rotineira.
          </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.successBtn}>
              <Text style={styles.successBtnText}>Ir para o login</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Criar conta</Text>
            <Text style={styles.subtitle}>Comece a organizar suas marmitas hoje.</Text>
          </View>

          <View style={styles.form}>
            {submitError && (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={14} color={colors.status.error} />
                <Text style={styles.errorBannerText}>{submitError}</Text>
              </View>
            )}

            {/* Nome */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>
                Nome completo <Text style={styles.required}>*</Text>
              </Text>
              <Input
                value={fullName}
                onChangeText={(v) => { setFullName(v); setErrors((e) => ({ ...e, fullName: '' })) }}
                autoCapitalize="words"
                autoComplete="name"
                placeholder="Maria Silva"
                error={errors.fullName}
              />
            </View>

            {/* E-mail */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>
                E-mail <Text style={styles.required}>*</Text>
              </Text>
              <Input
                value={email}
                onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: '' })) }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="seu@email.com"
                error={errors.email}
              />
            </View>

            {/* Senha */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>
                Senha <Text style={styles.required}>*</Text>
              </Text>
              <Input
                value={password}
                onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: '' })) }}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                error={errors.password}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color={colors.text.muted}
                    />
                  </TouchableOpacity>
                }
              />
              {password.length > 0 && (
                <View style={styles.strengthWrapper}>
                  <View style={styles.strengthBar}>
                    {[1, 2, 3, 4].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.strengthSegment,
                          { backgroundColor: i <= strength.level ? strength.color : colors.border.light },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>
                    {strength.label}
                  </Text>
                </View>
              )}
            </View>

            {/* Confirmar senha */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>
                Confirmar senha <Text style={styles.required}>*</Text>
              </Text>
              <Input
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); setErrors((e) => ({ ...e, confirmPassword: '' })) }}
                secureTextEntry={!showConfirm}
                autoComplete="new-password"
                placeholder="Repita a senha"
                error={errors.confirmPassword}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setShowConfirm(!showConfirm)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather
                      name={showConfirm ? 'eye-off' : 'eye'}
                      size={20}
                      color={colors.text.muted}
                    />
                  </TouchableOpacity>
                }
              />
            </View>

            <Text style={styles.requiredNote}>
              <Text style={styles.required}>*</Text> Campos obrigatórios
            </Text>

            <Button label="Criar conta" onPress={handleRegister} loading={loading} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Já tem conta? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Entrar</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function traduzeErro(msg: string): string {
  if (msg.includes('already registered')) return 'Este e-mail já está cadastrado.'
  if (msg.includes('Password should be')) return 'Senha muito fraca. Use letras e números.'
  return msg
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.screen },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing['6'],
    gap: spacing['5'],
  },
  header: { gap: spacing['1'] },
  title: { ...textStyles.h1, color: colors.text.heading },
  subtitle: { ...textStyles.body, color: colors.text.muted },
  form: { gap: spacing['4'] },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
    backgroundColor: '#FEE9E7',
    borderRadius: radius.sm,
    padding: spacing['3'],
  },
  errorBannerText: {
    ...textStyles.bodySmall,
    color: colors.status.error,
    flex: 1,
  },
  fieldWrapper: { gap: spacing['1'] },
  label: {
    ...textStyles.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.text.heading,
  },
  required: {
    color: colors.status.error,
    fontFamily: fontFamily.semiBold,
  },
  requiredNote: {
    ...textStyles.caption,
    color: colors.text.muted,
    marginTop: -spacing['2'],
  },
  strengthWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
    marginTop: spacing['2'],
  },
  strengthBar: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    ...textStyles.caption,
    fontFamily: fontFamily.semiBold,
    minWidth: 40,
    textAlign: 'right',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['6'],
    gap: spacing['4'],
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { ...textStyles.h1, color: colors.text.heading, textAlign: 'center' },
  successSubtitle: { ...textStyles.body, color: colors.text.muted, textAlign: 'center' },
  successBtn: { marginTop: spacing['4'] },
  successBtnText: {
    ...textStyles.body,
    fontFamily: fontFamily.semiBold,
    color: colors.brand.accent,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: { ...textStyles.body, color: colors.text.body },
  footerLink: {
    ...textStyles.body,
    fontFamily: fontFamily.semiBold,
    color: colors.brand.accent,
  },
})
