import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native'
import { Stack, useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { colors } from '../../src/theme/colors'
import { textStyles, fontFamily } from '../../src/theme/typography'
import { spacing, radius, shadow } from '../../src/theme/spacing'
import { Button } from '../../src/components/ui/Button'
import { getPlan } from '../../src/services/plans'
import type { WeeklyPlan, DailyMeal, ShoppingItem, MealPortion } from '../../src/types/plans'
import { SHOPPING_CATEGORIES } from '../../src/types/plans'

type Tab = 'cardapio' | 'compras' | 'montagem'

export default function PlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<Tab>('cardapio')

  const { data: plan, isError } = useQuery<WeeklyPlan>({
    queryKey: ['plan', id],
    queryFn: () => getPlan(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'pending' || status === 'processing' ? 3000 : false
    },
    enabled: !!id,
  })

  const isLoading = !plan || plan.status === 'pending' || plan.status === 'processing'
  const isGenError = plan?.status === 'error' || isError

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerTitle: 'Cardápio Semanal',
          headerTitleStyle: { ...textStyles.h3, color: colors.text.inverse } as any,
          headerBackTitle: '',
        }}
      />

      {isLoading && !isGenError && <LoadingView />}
      {isGenError && <ErrorView message={plan?.error_message} onBack={() => router.back()} />}

      {plan?.status === 'done' && plan.meals && (
        <>
          <TabBar activeTab={activeTab} onSelect={setActiveTab} />
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'cardapio' && (
              <MealsSection meals={plan.meals} />
            )}
            {activeTab === 'compras' && plan.shopping_list && (
              <ShoppingSection items={plan.shopping_list} />
            )}
            {activeTab === 'montagem' && (
              <AssemblySection meals={plan.meals} />
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  )
}

function LoadingView() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.brand.primary} />
      <Text style={styles.loadingTitle}>Montando seu cardápio com IA...</Text>
      <Text style={styles.loadingSubtitle}>
        Isso pode levar até 30 segundos.{'\n'}Estamos calculando as porções para cada membro.
      </Text>
    </View>
  )
}

function ErrorView({ message, onBack }: { message?: string; onBack: () => void }) {
  return (
    <View style={styles.centered}>
      <Feather name="alert-circle" size={48} color={colors.status.error} />
      <Text style={styles.errorTitle}>Falha na geração</Text>
      <Text style={styles.errorMessage}>
        {message ?? 'Não foi possível gerar o cardápio. Tente novamente.'}
      </Text>
      <View style={styles.errorButton}>
        <Button label="Voltar" onPress={onBack} variant="outline" />
      </View>
    </View>
  )
}

function TabBar({ activeTab, onSelect }: { activeTab: Tab; onSelect: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
    { key: 'cardapio',  label: 'Cardápio',   icon: 'calendar' },
    { key: 'compras',   label: 'Compras',    icon: 'shopping-cart' },
    { key: 'montagem',  label: 'Montagem',   icon: 'package' },
  ]
  return (
    <View style={styles.tabBar}>
      {tabs.map(({ key, label, icon }) => (
        <TouchableOpacity
          key={key}
          style={[styles.tab, activeTab === key && styles.tabActive]}
          onPress={() => onSelect(key)}
          activeOpacity={0.8}
        >
          <Feather name={icon} size={14} color={activeTab === key ? colors.brand.primary : colors.text.muted} />
          <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

function MealsSection({ meals }: { meals: DailyMeal[] }) {
  return (
    <View style={styles.section}>
      {meals.map((meal) => (
        <MealCard key={meal.day} meal={meal} />
      ))}
    </View>
  )
}

function MealCard({ meal }: { meal: DailyMeal }) {
  const [showPrep, setShowPrep] = useState(false)
  const members = Object.entries(meal.portions)
  const totalTime = (meal.prep_time_min ?? 0) + (meal.cook_time_min ?? 0)

  return (
    <>
      <View style={styles.card}>
        <View style={styles.mealHeader}>
          <Text style={styles.dayLabel}>{meal.day}</Text>
          <Text style={styles.lunchName}>{meal.lunch}</Text>
          {totalTime > 0 && (
            <View style={styles.timeInfo}>
              <Feather name="clock" size={12} color={colors.text.muted} />
              <Text style={styles.timeInfoText}>{totalTime} min no total</Text>
            </View>
          )}
        </View>
        <View style={styles.portionList}>
          {members.map(([name, portion]) => (
            <View key={name} style={styles.portionRow}>
              <View style={styles.portionAvatar}>
                <Text style={styles.portionAvatarText}>{name[0].toUpperCase()}</Text>
              </View>
              <Text style={styles.portionName}>{name}</Text>
              <Text style={styles.portionWeight}>{Math.round(portion.total_g)}g</Text>
              <View style={styles.portionBreakdown}>
                <Text style={styles.breakdownText}>
                  P:{Math.round(portion.protein_g)}g · C:{Math.round(portion.carb_g)}g · V:{Math.round(portion.vegetable_g)}g
                </Text>
              </View>
            </View>
          ))}
          <View style={styles.macroLegend}>
            <Text style={styles.macroLegendText}>P = Proteína · C = Carboidrato · V = Vegetal</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.prepButton} onPress={() => setShowPrep(true)} activeOpacity={0.7}>
          <Feather name="search" size={15} color={colors.brand.primary} />
          <Text style={styles.prepButtonText}>Ver modo de preparo</Text>
        </TouchableOpacity>
      </View>

      <PrepModal meal={meal} visible={showPrep} onClose={() => setShowPrep(false)} />
    </>
  )
}

function PrepModal({ meal, visible, onClose }: { meal: DailyMeal; visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
        <View style={styles.modalHeader}>
          <View style={styles.modalTitleBlock}>
            <Text style={styles.modalDay}>{meal.day}</Text>
            <Text style={styles.modalTitle}>{meal.lunch}</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Feather name="x" size={22} color={colors.text.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
          {/* Tempo */}
          <View style={styles.timeRow}>
            <View style={styles.timeChip}>
              <Feather name="scissors" size={14} color={colors.brand.secondary} />
              <Text style={styles.timeChipLabel}>Preparo</Text>
              <Text style={styles.timeChipValue}>{meal.prep_time_min ?? 0} min</Text>
            </View>
            <View style={styles.timeChip}>
              <Feather name="thermometer" size={14} color={colors.brand.accent} />
              <Text style={styles.timeChipLabel}>Cozimento</Text>
              <Text style={styles.timeChipValue}>{meal.cook_time_min ?? 0} min</Text>
            </View>
            <View style={styles.timeChip}>
              <Feather name="clock" size={14} color={colors.brand.primary} />
              <Text style={styles.timeChipLabel}>Total</Text>
              <Text style={styles.timeChipValue}>{(meal.prep_time_min ?? 0) + (meal.cook_time_min ?? 0)} min</Text>
            </View>
          </View>

          {/* Utensílios */}
          {meal.utensils?.length > 0 && (
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Utensílios</Text>
              <View style={styles.utensilsGrid}>
                {meal.utensils.map((u, i) => (
                  <View key={i} style={styles.utensilChip}>
                    <Feather name="tool" size={12} color={colors.brand.primary} />
                    <Text style={styles.utensilText}>{u}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Modo de Preparo */}
          {meal.instructions?.length > 0 && (
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Modo de Preparo</Text>
              {meal.instructions.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

function AssemblySection({ meals }: { meals: DailyMeal[] }) {
  const members = Object.keys(meals[0]?.portions ?? {})
  const [selected, setSelected] = useState(members[0] ?? '')

  if (members.length === 0) return null

  const weekTotal = meals.reduce((sum, m) => sum + (m.portions[selected]?.total_g ?? 0), 0)

  return (
    <View style={styles.section}>
      {/* Seletor de membro */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberSelector}>
        {members.map((name) => (
          <TouchableOpacity
            key={name}
            style={[styles.memberPill, selected === name && styles.memberPillActive]}
            onPress={() => setSelected(name)}
            activeOpacity={0.7}
          >
            <Text style={[styles.memberPillText, selected === name && styles.memberPillTextActive]}>
              {name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Resumo da semana */}
      <View style={styles.assemblySummaryCard}>
        <View style={styles.assemblySummaryRow}>
          <View style={styles.assemblyStat}>
            <Text style={styles.assemblyStatValue}>{meals.length}</Text>
            <Text style={styles.assemblyStatLabel}>marmitas</Text>
          </View>
          <View style={styles.assemblySeparator} />
          <View style={styles.assemblyStat}>
            <Text style={styles.assemblyStatValue}>{(weekTotal / 1000).toFixed(1)} kg</Text>
            <Text style={styles.assemblyStatLabel}>total na semana</Text>
          </View>
          <View style={styles.assemblySeparator} />
          <View style={styles.assemblyStat}>
            <Text style={styles.assemblyStatValue}>{Math.round(weekTotal / meals.length)}g</Text>
            <Text style={styles.assemblyStatLabel}>média/marmita</Text>
          </View>
        </View>
      </View>

      {/* Marmitas por dia */}
      {meals.map((meal) => {
        const portion = meal.portions[selected]
        if (!portion) return null
        return <ContainerCard key={meal.day} meal={meal} portion={portion} />
      })}
    </View>
  )
}

function ContainerCard({ meal, portion }: { meal: DailyMeal; portion: MealPortion }) {
  return (
    <View style={styles.containerCard}>
      <View style={styles.containerHeader}>
        <View style={styles.containerInfo}>
          <Text style={styles.containerDay}>{meal.day}</Text>
          <Text style={styles.containerRecipe}>{meal.lunch}</Text>
        </View>
        <View style={styles.containerWeight}>
          <Text style={styles.containerWeightValue}>{Math.round(portion.total_g)}g</Text>
          <Text style={styles.containerWeightLabel}>1 marmita</Text>
        </View>
      </View>
      <View style={styles.barsWrapper}>
        <ComponentBar label="Proteína" value={portion.protein_g} total={portion.total_g} color={colors.brand.accent} />
        <ComponentBar label="Carboidrato" value={portion.carb_g} total={portion.total_g} color={colors.brand.primary} />
        <ComponentBar label="Vegetal" value={portion.vegetable_g} total={portion.total_g} color={colors.brand.secondary} />
      </View>
    </View>
  )
}

function ComponentBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={styles.barValue}>{Math.round(value)}g</Text>
    </View>
  )
}

function ShoppingSection({ items }: { items: ShoppingItem[] }) {
  const byCategory = SHOPPING_CATEGORIES.reduce<Record<string, ShoppingItem[]>>((acc, cat) => {
    acc[cat] = items.filter((i) => i.category === cat)
    return acc
  }, {} as Record<string, ShoppingItem[]>)

  const otherItems = items.filter((i) => !SHOPPING_CATEGORIES.includes(i.category as any))
  const total = items.reduce((sum, i) => sum + (i.price_estimate_brl ?? 0), 0)

  return (
    <View style={styles.section}>
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Estimativa total da semana</Text>
        <Text style={styles.totalValue}>
          R$ {total.toFixed(2).replace('.', ',')}
        </Text>
        <Text style={styles.totalDisclaimer}>* Baseado em preços médios de supermercado</Text>
      </View>
      {SHOPPING_CATEGORIES.map((cat) =>
        byCategory[cat].length > 0 ? (
          <CategorySection key={cat} title={cat} items={byCategory[cat]} />
        ) : null
      )}
      {otherItems.length > 0 && (
        <CategorySection title="OUTROS" items={otherItems} />
      )}
    </View>
  )
}

function CategorySection({ title, items }: { title: string; items: ShoppingItem[] }) {
  return (
    <View style={styles.categorySection}>
      <Text style={styles.categoryTitle}>{title}</Text>
      {items.map((item, i) => (
        <View key={i} style={styles.shoppingItem}>
          <View style={styles.shoppingDot} />
          <Text style={styles.shoppingName}>{item.name}</Text>
          <Text style={styles.shoppingQty}>{item.quantity}</Text>
          {item.price_estimate_brl > 0 && (
            <Text style={styles.shoppingPrice}>
              R$ {item.price_estimate_brl.toFixed(2).replace('.', ',')}
            </Text>
          )}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.screen },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['8'],
    gap: spacing['4'],
  },
  loadingTitle: {
    ...textStyles.h3,
    color: colors.text.heading,
    textAlign: 'center',
    marginTop: spacing['3'],
  },
  loadingSubtitle: {
    ...textStyles.body,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorTitle: { ...textStyles.h3, color: colors.text.heading, textAlign: 'center' },
  errorMessage: {
    ...textStyles.body,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorButton: { width: '100%', marginTop: spacing['2'] },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.background.card,
    marginHorizontal: spacing['6'],
    marginTop: spacing['4'],
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['1'],
    paddingVertical: spacing['2'],
    borderRadius: radius.sm,
  },
  tabActive: { backgroundColor: colors.background.screen, ...shadow.card },
  tabText: { ...textStyles.bodySmall, color: colors.text.muted },
  tabTextActive: {
    ...textStyles.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.brand.primary,
  },

  scroll: { padding: spacing['6'], paddingTop: spacing['4'], gap: spacing['4'] },
  section: { gap: spacing['3'] },

  card: {
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing['4'],
    gap: spacing['3'],
    ...shadow.card,
  },
  mealHeader: { gap: spacing['1'] },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timeInfoText: {
    ...textStyles.caption,
    color: colors.text.muted,
  },
  prepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['2'],
    paddingVertical: spacing['3'],
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.brand.primary + '50',
    backgroundColor: colors.brand.primary + '0A',
    marginTop: spacing['1'],
  },
  prepButtonText: {
    ...textStyles.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.brand.primary,
  },
  dayLabel: {
    ...textStyles.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.brand.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  lunchName: { ...textStyles.h3, color: colors.text.heading },

  portionList: { gap: spacing['2'] },
  portionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
    flexWrap: 'wrap',
  },
  portionAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portionAvatarText: {
    ...textStyles.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.brand.primary,
  },
  portionName: { ...textStyles.bodySmall, fontFamily: fontFamily.semiBold, color: colors.text.body, flex: 1 },
  portionWeight: {
    ...textStyles.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.brand.accent,
  },
  portionBreakdown: { width: '100%', paddingLeft: 28 + spacing['2'] },
  breakdownText: { ...textStyles.caption, color: colors.text.muted },
  macroLegend: {
    marginTop: spacing['1'],
    paddingTop: spacing['2'],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  macroLegendText: {
    ...textStyles.caption,
    color: colors.text.muted,
    fontStyle: 'italic',
  },

  categorySection: { gap: spacing['2'] },
  categoryTitle: {
    ...textStyles.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.brand.primary,
    letterSpacing: 1,
    marginBottom: spacing['1'],
  },
  shoppingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
    paddingVertical: spacing['2'],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  shoppingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand.secondary,
  },
  shoppingName: { ...textStyles.body, color: colors.text.body, flex: 1 },
  shoppingQty: {
    ...textStyles.bodySmall,
    color: colors.text.muted,
  },
  shoppingPrice: {
    ...textStyles.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.brand.accent,
  },

  modalSafe: { flex: 1, backgroundColor: colors.background.screen },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: spacing['6'],
    paddingBottom: spacing['4'],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitleBlock: { flex: 1, gap: spacing['1'] },
  modalDay: {
    ...textStyles.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.brand.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  modalTitle: { ...textStyles.h3, color: colors.text.heading },
  modalScroll: { padding: spacing['6'], gap: spacing['5'] },

  timeRow: { flexDirection: 'row', gap: spacing['3'] },
  timeChip: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    padding: spacing['3'],
    borderRadius: radius.md,
    backgroundColor: colors.background.card,
    ...shadow.card,
  },
  timeChipLabel: { ...textStyles.caption, color: colors.text.muted },
  timeChipValue: { ...textStyles.bodySmall, fontFamily: fontFamily.semiBold, color: colors.text.heading },

  modalSection: { gap: spacing['3'] },
  modalSectionTitle: {
    ...textStyles.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.text.heading,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  utensilsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['2'] },
  utensilChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['1'],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.brand.primary + '40',
    backgroundColor: colors.brand.primary + '08',
  },
  utensilText: { ...textStyles.caption, color: colors.brand.primary },

  stepRow: { flexDirection: 'row', gap: spacing['3'], alignItems: 'flex-start' },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  stepNumberText: { ...textStyles.caption, fontFamily: fontFamily.semiBold, color: colors.text.inverse },
  stepText: { ...textStyles.body, color: colors.text.body, flex: 1, lineHeight: 22 },

  totalCard: {
    backgroundColor: colors.brand.primary + '12',
    borderRadius: radius.lg,
    padding: spacing['4'],
    alignItems: 'center',
    gap: spacing['1'],
    marginBottom: spacing['2'],
  },
  totalLabel: {
    ...textStyles.bodySmall,
    color: colors.text.muted,
  },
  totalValue: {
    ...textStyles.h2,
    fontFamily: fontFamily.semiBold,
    color: colors.brand.primary,
  },
  totalDisclaimer: {
    ...textStyles.caption,
    color: colors.text.muted,
    textAlign: 'center',
  },

  // ── Guia de Montagem ─────────────────────────────────────────────────────
  memberSelector: { gap: spacing['2'], paddingBottom: spacing['1'] },
  memberPill: {
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['2'],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.card,
  },
  memberPillActive: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primary + '14',
  },
  memberPillText: {
    ...textStyles.bodySmall,
    color: colors.text.muted,
  },
  memberPillTextActive: {
    fontFamily: fontFamily.semiBold,
    color: colors.brand.primary,
  },

  assemblySummaryCard: {
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing['4'],
    ...shadow.card,
  },
  assemblySummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  assemblyStat: { alignItems: 'center', gap: 2 },
  assemblyStatValue: {
    ...textStyles.h3,
    fontFamily: fontFamily.semiBold,
    color: colors.brand.primary,
  },
  assemblyStatLabel: { ...textStyles.caption, color: colors.text.muted },
  assemblySeparator: {
    width: 1,
    height: 32,
    backgroundColor: colors.border.light,
  },

  containerCard: {
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing['4'],
    gap: spacing['3'],
    ...shadow.card,
  },
  containerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  containerInfo: { flex: 1 },
  containerDay: {
    ...textStyles.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.brand.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  containerRecipe: { ...textStyles.h3, color: colors.text.heading, marginTop: 2 },
  containerWeight: { alignItems: 'flex-end', flexShrink: 0, marginLeft: spacing['3'] },
  containerWeightValue: {
    ...textStyles.h3,
    fontFamily: fontFamily.semiBold,
    color: colors.brand.accent,
  },
  containerWeightLabel: { ...textStyles.caption, color: colors.text.muted },

  barsWrapper: { gap: spacing['2'] },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing['2'] },
  barLabel: { ...textStyles.caption, color: colors.text.muted, width: 80 },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.border.light,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: radius.full },
  barValue: {
    ...textStyles.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.text.body,
    width: 40,
    textAlign: 'right',
  },
})
