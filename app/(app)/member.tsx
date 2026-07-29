import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native'
import { Stack, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '../../src/theme/colors'
import { textStyles, fontFamily } from '../../src/theme/typography'
import { spacing, radius } from '../../src/theme/spacing'
import { Input } from '../../src/components/ui/Input'
import { Button } from '../../src/components/ui/Button'
import { useFamilyStore } from '../../src/store/family'
import {
  RESTRICTIONS,
  APPETITE_LABELS,
  TYPE_LABELS,
  type MemberType,
  type Appetite,
  type RestrictionId,
} from '../../src/types/family'

export default function MemberScreen() {
  const { editingMember, editingIndex, commitMember } = useFamilyStore()

  const [name, setName] = useState(editingMember?.name ?? '')
  const [type, setType] = useState<MemberType>(editingMember?.type ?? 'adult')
  const [appetite, setAppetite] = useState<Appetite>(editingMember?.appetite ?? 'moderate')
  const [restrictions, setRestrictions] = useState<RestrictionId[]>(
    editingMember?.restrictions ?? []
  )
  const [calorieLimitInput, setCalorieLimitInput] = useState(
    editingMember?.calorie_limit_kcal != null ? String(editingMember.calorie_limit_kcal) : ''
  )
  const [nameError, setNameError] = useState('')

  const isEditing = editingIndex !== null

  function toggleRestriction(id: RestrictionId) {
    setRestrictions((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    )
  }

  function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) {
      setNameError('O nome é obrigatório.')
      return
    }
    const parsedCalories = calorieLimitInput.trim() === ''
      ? null
      : parseInt(calorieLimitInput.replace(',', '.'), 10)
    commitMember({
      name: trimmed,
      type,
      appetite,
      restrictions,
      objectives: [],
      calorie_limit_kcal: Number.isFinite(parsedCalories) ? parsedCalories : null,
    })
    router.back()
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerTitle: isEditing ? 'Editar membro' : 'Novo membro',
          headerTitleStyle: { ...textStyles.h3, color: colors.text.inverse } as any,
          headerBackTitle: '',
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Nome */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Nome <Text style={styles.required}>*</Text>
            </Text>
            <Input
              value={name}
              onChangeText={(v) => { setName(v); setNameError('') }}
              placeholder="Ex: Maria, João, Bebê..."
              autoCapitalize="words"
              autoFocus
              error={nameError}
            />
          </View>

          {/* Tipo */}
          <View style={styles.field}>
            <Text style={styles.label}>Tipo</Text>
            <ToggleGroup<MemberType>
              options={[
                { value: 'adult', label: TYPE_LABELS.adult },
                { value: 'child', label: TYPE_LABELS.child },
              ]}
              value={type}
              onChange={setType}
            />
          </View>

          {/* Apetite */}
          <View style={styles.field}>
            <Text style={styles.label}>Apetite</Text>
            <Text style={styles.hint}>Define o tamanho das porções para este membro.</Text>
            <ToggleGroup<Appetite>
              options={[
                { value: 'low',      label: APPETITE_LABELS.low },
                { value: 'moderate', label: APPETITE_LABELS.moderate },
                { value: 'high',     label: APPETITE_LABELS.high },
              ]}
              value={appetite}
              onChange={setAppetite}
            />
          </View>

          {/* Restrições */}
          <View style={styles.field}>
            <Text style={styles.label}>Restrições alimentares</Text>
            <Text style={styles.hint}>
              Opcional. A IA vai respeitar estas restrições no cardápio.
            </Text>
            <View style={styles.chips}>
              {RESTRICTIONS.map((r) => {
                const active = restrictions.includes(r.id)
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleRestriction(r.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Limite de calorias */}
          <View style={styles.field}>
            <Text style={styles.label}>Limite calórico diário (opcional)</Text>
            <Text style={styles.hint}>
              A IA ajustará as porções para não ultrapassar este valor. Ex: 1800 para dieta de emagrecimento.
            </Text>
            <View style={styles.calorieRow}>
              <TextInput
                style={styles.calorieInput}
                value={calorieLimitInput}
                onChangeText={setCalorieLimitInput}
                placeholder="Ex: 1800"
                placeholderTextColor={colors.text.placeholder}
                keyboardType="number-pad"
                returnKeyType="done"
              />
              <View style={styles.calorieSuffix}>
                <Text style={styles.calorieSuffixText}>kcal/dia</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button label="Salvar membro" onPress={handleSave} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (v: T) => void
}) {
  return (
    <View style={styles.toggleGroup}>
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.toggleOption, active && styles.toggleOptionActive]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.screen },
  flex: { flex: 1 },
  scroll: {
    padding: spacing['6'],
    gap: spacing['5'],
    paddingBottom: spacing['4'],
  },

  field: { gap: spacing['2'] },
  label: {
    ...textStyles.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.text.heading,
  },
  required: { color: colors.status.error },
  hint: {
    ...textStyles.caption,
    color: colors.text.muted,
    marginTop: -spacing['1'],
  },

  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: colors.background.badge,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: spacing['2'],
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  toggleOptionActive: {
    backgroundColor: colors.brand.primary,
  },
  toggleText: {
    ...textStyles.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.text.muted,
  },
  toggleTextActive: {
    color: colors.text.inverse,
  },

  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing['2'],
  },
  chip: {
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['2'],
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    backgroundColor: colors.background.card,
  },
  chipActive: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primary + '14',
  },
  chipText: {
    ...textStyles.bodySmall,
    color: colors.text.body,
  },
  chipTextActive: {
    color: colors.brand.primary,
    fontFamily: fontFamily.semiBold,
  },

  footer: {
    padding: spacing['6'],
    paddingTop: spacing['3'],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: colors.background.screen,
  },

  calorieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.input,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border.medium,
    overflow: 'hidden',
    height: 52,
  },
  calorieInput: {
    flex: 1,
    paddingHorizontal: spacing['4'],
    ...textStyles.body,
    color: colors.text.heading,
  },
  calorieSuffix: {
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['3'],
    backgroundColor: colors.background.badge,
    borderLeftWidth: 1,
    borderLeftColor: colors.border.light,
    height: '100%',
    justifyContent: 'center',
  },
  calorieSuffixText: {
    ...textStyles.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.text.muted,
  },
})
