import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native'
import { Stack, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { colors } from '../../src/theme/colors'
import { textStyles, fontFamily } from '../../src/theme/typography'
import { spacing, radius, shadow } from '../../src/theme/spacing'
import { Button } from '../../src/components/ui/Button'
import { useAuthStore } from '../../src/store/auth'
import { useFamilyStore } from '../../src/store/family'
import { fetchFamilyProfile, saveFamilyProfile } from '../../src/services/family'
import {
  APPETITE_LABELS,
  TYPE_LABELS,
  RESTRICTIONS,
  type FamilyMember,
} from '../../src/types/family'

export default function FamilyScreen() {
  const { user } = useAuthStore()
  const { profileId, members, loadProfile, startAddMember, startEditMember, removeMember } =
    useFamilyStore()
  const [isLoading, setIsLoading] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const fetchedRef = useRef(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (fetchedRef.current || !user?.id) return
    fetchedRef.current = true
    setIsLoading(true)
    fetchFamilyProfile(user.id)
      .then((data) => {
        loadProfile(data?.id ?? null, (data?.members ?? []) as FamilyMember[])
        if (data?.weekly_budget_brl != null) {
          setBudgetInput(String(data.weekly_budget_brl))
        }
      })
      .catch(() => Alert.alert('Erro', 'Não foi possível carregar o perfil familiar.'))
      .finally(() => setIsLoading(false))
  }, [user?.id])

  const parsedBudget = budgetInput.trim() === ''
    ? null
    : parseFloat(budgetInput.replace(',', '.'))

  const saveMutation = useMutation({
    mutationFn: () => saveFamilyProfile(
      user!.id,
      members,
      Number.isFinite(parsedBudget) ? parsedBudget : null,
      profileId ?? undefined,
    ),
    onSuccess: (data) => {
      loadProfile(data.id, data.members as FamilyMember[])
      queryClient.invalidateQueries({ queryKey: ['family_profile'] })
      router.back()
    },
    onError: () =>
      Alert.alert('Erro', 'Não foi possível salvar o perfil. Tente novamente.'),
  })

  function handleAdd() {
    startAddMember()
    router.push('/member')
  }

  function handleEdit(index: number) {
    startEditMember(index)
    router.push('/member')
  }

  function handleDelete(index: number) {
    Alert.alert('Remover membro', `Remover "${members[index].name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => removeMember(index) },
    ])
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerTitle: 'Perfil Familiar',
          headerTitleStyle: { ...textStyles.h3, color: colors.text.inverse } as any,
          headerBackTitle: '',
        }}
      />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand.primary} size="large" />
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              members.length === 0 && styles.scrollCenter,
            ]}
            showsVerticalScrollIndicator={false}
          >
            {members.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Feather name="users" size={32} color={colors.brand.secondary} />
                </View>
                <Text style={styles.emptyTitle}>Nenhum membro adicionado</Text>
                <Text style={styles.emptySubtitle}>
                  Adicione os membros da família para gerar o cardápio semanal com as
                  porções certas para cada um.
                </Text>
                <Button label="Adicionar primeiro membro" onPress={handleAdd} />
              </View>
            ) : (
              <>
                <Text style={styles.countLabel}>
                  {members.length} {members.length === 1 ? 'membro' : 'membros'}
                </Text>
                {members.map((member, i) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    onEdit={() => handleEdit(i)}
                    onDelete={() => handleDelete(i)}
                  />
                ))}
                <Button
                  label="Adicionar membro"
                  variant="outline"
                  icon={<Feather name="plus" size={18} color={colors.brand.primary} />}
                  onPress={handleAdd}
                />

                <View style={styles.budgetSection}>
                  <Text style={styles.budgetLabel}>Orçamento máximo semanal (opcional)</Text>
                  <Text style={styles.budgetHint}>
                    A IA tentará sugerir refeições dentro desse valor.
                  </Text>
                  <View style={styles.budgetInputRow}>
                    <View style={styles.budgetPrefix}>
                      <Text style={styles.budgetPrefixText}>R$</Text>
                    </View>
                    <TextInput
                      style={styles.budgetInput}
                      value={budgetInput}
                      onChangeText={setBudgetInput}
                      placeholder="Ex: 300"
                      placeholderTextColor={colors.text.placeholder}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                    />
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          {members.length > 0 && (
            <View style={styles.footer}>
              <Button
                label="Salvar perfil"
                onPress={() => saveMutation.mutate()}
                loading={saveMutation.isPending}
              />
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  )
}

function MemberCard({
  member,
  onEdit,
  onDelete,
}: {
  member: FamilyMember
  onEdit: () => void
  onDelete: () => void
}) {
  const initial = member.name.trim().charAt(0).toUpperCase() || '?'
  const activeRestrictions = RESTRICTIONS.filter((r) => member.restrictions.includes(r.id))

  return (
    <View style={styles.card}>
      <View style={styles.cardAvatar}>
        <Text style={styles.cardAvatarText}>{initial}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{member.name || 'Sem nome'}</Text>
        <View style={styles.cardBadges}>
          <Badge label={TYPE_LABELS[member.type]} color={colors.brand.primary} />
          <Badge label={APPETITE_LABELS[member.appetite]} color={colors.brand.secondary} />
        </View>
        {activeRestrictions.length > 0 && (
          <View style={styles.cardChips}>
            {activeRestrictions.map((r) => (
              <View key={r.id} style={styles.chip}>
                <Text style={styles.chipText}>{r.label}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={onEdit}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="edit-2" size={18} color={colors.text.muted} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="trash-2" size={18} color={colors.status.error} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '1A' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.screen },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: spacing['6'], gap: spacing['4'] },
  scrollCenter: { flexGrow: 1, justifyContent: 'center' },

  empty: {
    alignItems: 'center',
    gap: spacing['4'],
    paddingHorizontal: spacing['4'],
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...textStyles.h3,
    color: colors.text.heading,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...textStyles.body,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: spacing['2'],
  },

  countLabel: {
    ...textStyles.label,
    color: colors.text.muted,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing['3'],
    backgroundColor: colors.background.card,
    borderRadius: radius.md,
    padding: spacing['4'],
    ...shadow.card,
  },
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardAvatarText: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.text.inverse,
  },
  cardBody: { flex: 1, gap: spacing['2'] },
  cardName: { ...textStyles.h3, color: colors.text.heading },
  cardBadges: { flexDirection: 'row', gap: spacing['2'], flexWrap: 'wrap' },
  cardChips: { flexDirection: 'row', gap: spacing['1'], flexWrap: 'wrap' },
  cardActions: { gap: spacing['3'] },

  badge: {
    paddingHorizontal: spacing['2'],
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgeText: {
    ...textStyles.caption,
    fontFamily: fontFamily.semiBold,
  },

  chip: {
    paddingHorizontal: spacing['2'],
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.background.badge,
  },
  chipText: {
    ...textStyles.caption,
    color: colors.text.body,
  },

  footer: {
    padding: spacing['6'],
    paddingTop: spacing['3'],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: colors.background.screen,
  },

  budgetSection: {
    gap: spacing['2'],
    paddingTop: spacing['2'],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  budgetLabel: {
    ...textStyles.h3,
    color: colors.text.heading,
  },
  budgetHint: {
    ...textStyles.bodySmall,
    color: colors.text.muted,
  },
  budgetInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.input,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.medium,
    overflow: 'hidden',
  },
  budgetPrefix: {
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['3'],
    backgroundColor: colors.background.badge,
    borderRightWidth: 1,
    borderRightColor: colors.border.light,
  },
  budgetPrefixText: {
    ...textStyles.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.body,
  },
  budgetInput: {
    flex: 1,
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['3'],
    ...textStyles.body,
    color: colors.text.heading,
  },
})
