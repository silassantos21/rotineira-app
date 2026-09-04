import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Animated,
  Image,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Stack, useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Feather, MaterialCommunityIcons as MCI } from '@expo/vector-icons'
import { colors } from '../../src/theme/colors'
import { textStyles, fontFamily } from '../../src/theme/typography'
import { spacing, radius, shadow } from '../../src/theme/spacing'
import { Button } from '../../src/components/ui/Button'
import { getPlan, adaptPlan } from '../../src/services/plans'
import { fetchFamilyProfile } from '../../src/services/family'
import { exportHtmlAsPdf } from '../../src/services/pdf'
import { useAuthStore } from '../../src/store/auth'
import type { FamilyProfile } from '../../src/types/family'
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from '../../src/lib/speech'
import { isExpoGo } from '../../src/services/notifications'
import type { WeeklyPlan, DailyMeal, ShoppingItem, MealPortion } from '../../src/types/plans'
import { SHOPPING_CATEGORIES } from '../../src/types/plans'

type Tab = 'cardapio' | 'compras' | 'montagem'

export default function PlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<Tab>('cardapio')
  const [showAdaptModal, setShowAdaptModal] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const { user } = useAuthStore()
  const isPremium = !!(user?.user_metadata?.is_premium)

  const { data: plan, isError } = useQuery<WeeklyPlan>({
    queryKey: ['plan', id],
    queryFn: () => getPlan(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'pending' || status === 'processing' ? 3000 : false
    },
    enabled: !!id,
  })

  const profileUserId = plan?.user_id ?? user?.id
  const { data: familyProfile } = useQuery<FamilyProfile | null>({
    queryKey: ['family_profile', profileUserId],
    queryFn: () => fetchFamilyProfile(profileUserId!),
    enabled: !!profileUserId,
  })

  const adaptMutation = useMutation({
    mutationFn: (feedback: string) => adaptPlan(id, feedback),
    onSuccess: (newPlan) => {
      setShowAdaptModal(false)
      router.push(`/plan?id=${newPlan.id}`)
    },
    onError: (err: Error) => {
      Alert.alert('Erro', err.message ?? 'Não foi possível adaptar o cardápio.')
    },
  })

  const isLoading = !plan || plan.status === 'pending' || plan.status === 'processing'
  const isGenError = plan?.status === 'error' || isError

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerTitle: plan?.period === 'biweekly' ? 'Cardápio Quinzenal'
                     : plan?.period === 'monthly'  ? 'Cardápio Mensal'
                     : 'Cardápio Semanal',
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
              <>
                <MealsSection meals={plan.meals} weekStart={plan.week_start} />
                <TouchableOpacity
                  style={styles.adaptButton}
                  onPress={() => setShowPrintModal(true)}
                  activeOpacity={0.7}
                >
                  <Feather name="printer" size={15} color={colors.brand.primary} />
                  <Text style={styles.adaptButtonText}>Imprimir cardápio</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.adaptButton}
                  onPress={() => isPremium ? setShowAdaptModal(true) : router.push('/paywall')}
                  activeOpacity={0.7}
                >
                  <Feather name="refresh-cw" size={15} color={colors.brand.primary} />
                  <Text style={styles.adaptButtonText}>Adaptar cardápio com IA</Text>
                </TouchableOpacity>
                <Text style={styles.adaptHint}>
                  {isPremium ? 'Descreva o que quer mudar e a IA ajusta o plano' : 'Recurso Premium — toque para saber mais'}
                </Text>
              </>
            )}
            {activeTab === 'compras' && plan.shopping_list && (
              <ShoppingSection
                items={plan.shopping_list}
                weekStart={plan.week_start}
                planId={id}
                budget={familyProfile?.weekly_budget_brl ?? null}
                period={plan.period}
              />
            )}
            {activeTab === 'montagem' && (
              <AssemblySection meals={plan.meals} weekStart={plan.week_start} />
            )}
          </ScrollView>

          <FeedbackModal
            visible={showAdaptModal}
            isLoading={adaptMutation.isPending}
            onClose={() => setShowAdaptModal(false)}
            onSubmit={(feedback) => adaptMutation.mutate(feedback)}
          />

          <PrintScopeModal
            visible={showPrintModal}
            meals={plan.meals}
            weekStart={plan.week_start}
            onClose={() => setShowPrintModal(false)}
          />
        </>
      )}
    </SafeAreaView>
  )
}

const _LOADING_STEPS = [
  'Analisando perfil familiar...',
  'Calculando porções por membro...',
  'Montando cardápio da semana...',
  'Organizando lista de compras...',
  'Finalizando seu plano...',
]

function LoadingView() {
  const pulseAnim = useRef(new Animated.Value(1)).current
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.35, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start()

    const interval = setInterval(() => {
      setCurrentStep((s) => (s < _LOADING_STEPS.length - 1 ? s + 1 : s))
    }, 5500)

    return () => {
      pulseAnim.stopAnimation()
      clearInterval(interval)
    }
  }, [])

  return (
    <View style={styles.loadingContainer}>
      <Animated.Image
        source={require('../../assets/images/logo.png')}
        style={[styles.loadingLogo, { opacity: pulseAnim }]}
        resizeMode="contain"
      />

      <View style={styles.stepsCard}>
        {_LOADING_STEPS.map((label, i) => {
          const isDone = i < currentStep
          const isActive = i === currentStep
          return (
            <View key={i} style={styles.loadingStepRow}>
              <View style={styles.loadingStepIconCol}>
                {isDone ? (
                  <Feather name="check" size={14} color={colors.status.success} />
                ) : isActive ? (
                  <ActivityIndicator size="small" color={colors.brand.primary} />
                ) : (
                  <View style={styles.loadingStepDot} />
                )}
              </View>
              <Text
                style={[
                  styles.loadingStepLabel,
                  isDone && styles.loadingStepLabelDone,
                  isActive && styles.loadingStepLabelActive,
                  !isDone && !isActive && styles.loadingStepLabelFuture,
                ]}
              >
                {label}
              </Text>
            </View>
          )
        })}
      </View>

      <Text style={styles.loadingSubtitle}>Isso pode levar até 30 segundos.</Text>
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
  const tabs: { key: Tab; label: string; mciIcon: React.ComponentProps<typeof MCI>['name'] }[] = [
    { key: 'cardapio', label: 'Cardápio', mciIcon: 'calendar-week-outline' },
    { key: 'compras',  label: 'Compras',  mciIcon: 'cart-outline' },
    { key: 'montagem', label: 'Montagem', mciIcon: 'bowl-mix-outline' },
  ]
  return (
    <View style={styles.tabBar}>
      {tabs.map(({ key, label, mciIcon }) => (
        <TouchableOpacity
          key={key}
          style={[styles.tab, activeTab === key && styles.tabActive]}
          onPress={() => onSelect(key)}
          activeOpacity={0.8}
        >
          <MCI name={mciIcon} size={16} color={activeTab === key ? colors.brand.primary : colors.text.muted} />
          <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const _DAY_OFFSETS: Array<[string, number]> = [
  ['segunda', 0], ['terça', 1], ['terca', 1], ['quarta', 2],
  ['quinta', 3], ['sexta', 4], ['sábado', 5], ['sabado', 5], ['domingo', 6],
  ['seg', 0], ['ter', 1], ['qua', 2], ['qui', 3], ['sex', 4], ['sáb', 5], ['sab', 5], ['dom', 6],
]

function getDayDate(dayStr: string, weekStart: string): string {
  const lower = dayStr.toLowerCase()
  let dayOffset = -1
  for (const [key, offset] of _DAY_OFFSETS) {
    if (lower.startsWith(key)) { dayOffset = offset; break }
  }
  if (dayOffset === -1) return ''
  const weekMatch = lower.match(/[-–]\s*s?(\d)(?:\b|$)/)
  const weekOffset = weekMatch ? (parseInt(weekMatch[1]) - 1) * 7 : 0
  const [y, m, d] = weekStart.split('-').map(Number)
  const date = new Date(y, m - 1, d + weekOffset + dayOffset)
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`
}

function MealsSection({ meals, weekStart }: { meals: DailyMeal[]; weekStart: string }) {
  return (
    <View style={styles.section}>
      {meals.map((meal) => (
        <MealCard key={meal.day} meal={meal} weekStart={weekStart} />
      ))}
    </View>
  )
}

function MealCard({ meal, weekStart }: { meal: DailyMeal; weekStart: string }) {
  const [showPrep, setShowPrep] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [activeMember, setActiveMember] = useState<string>('resumo')
  const memberNames = Object.keys(meal.portions)
  const totalTime = (meal.prep_time_min ?? 0) + (meal.cook_time_min ?? 0)
  const dayDate = getDayDate(meal.day, weekStart)

  const collapsedSummary = [meal.breakfast, meal.lunch, meal.dinner]
    .filter(Boolean)
    .join(' · ')

  const dailyRows = memberNames
    .map((name) => {
      const lunchP = meal.portions[name]
      const bfP = meal.breakfast_portions?.[name]
      const dinP = meal.dinner_portions?.[name]
      return {
        name,
        total_g: lunchP.total_g + (bfP?.total_g ?? 0) + (dinP?.total_g ?? 0),
        protein_g: lunchP.protein_g + (bfP?.protein_g ?? 0) + (dinP?.protein_g ?? 0),
        carb_g: lunchP.carb_g + (bfP?.carb_g ?? 0) + (dinP?.carb_g ?? 0),
        vegetable_g: lunchP.vegetable_g + (bfP?.vegetable_g ?? 0) + (dinP?.vegetable_g ?? 0),
      }
    })

  const selectedBreakfast = activeMember !== 'resumo' ? meal.breakfast_portions?.[activeMember] : undefined
  const selectedLunch = activeMember !== 'resumo' ? meal.portions[activeMember] : undefined
  const selectedDinner = activeMember !== 'resumo' ? meal.dinner_portions?.[activeMember] : undefined
  const selectedAltLunch = activeMember !== 'resumo' ? meal.member_lunches?.[activeMember] : undefined

  return (
    <>
      <View style={styles.card}>
        {/* Cabeçalho — sempre visível, toca para expandir/recolher */}
        <TouchableOpacity
          style={styles.cardHeaderRow}
          onPress={() => setExpanded((v) => !v)}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.dayLabel}>
              {dayDate ? `${meal.day.toUpperCase()}  ·  ${dayDate}` : meal.day.toUpperCase()}
            </Text>
            {!expanded && (
              <Text style={styles.collapsedNames} numberOfLines={2}>
                {collapsedSummary}
              </Text>
            )}
          </View>
          <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text.muted} />
        </TouchableOpacity>

        {expanded && (
          <>
            {meal.breakfast && (
              <>
                <View style={styles.mealSectionHeader}>
                  <MCI name="coffee-outline" size={13} color={colors.brand.accent} />
                  <Text style={[styles.mealSectionLabel, { color: colors.brand.accent }]}>CAFÉ DA MANHÃ</Text>
                </View>
                <Text style={styles.lunchName}>{meal.breakfast}</Text>
                <View style={styles.mealDivider} />
              </>
            )}

            <View style={styles.mealSectionHeader}>
              <MCI name="silverware-fork-knife" size={13} color={colors.brand.secondary} />
              <Text style={styles.mealSectionLabel}>ALMOÇO</Text>
            </View>
            <Text style={styles.lunchName}>{meal.lunch}</Text>
            {totalTime > 0 && (
              <View style={styles.timeInfo}>
                <Feather name="clock" size={12} color={colors.text.muted} />
                <Text style={styles.timeInfoText}>{totalTime} min no total</Text>
              </View>
            )}
            {meal.dessert && (
              <View style={styles.dessertChip}>
                <MCI name="ice-cream" size={13} color={colors.brand.secondary} />
                <Text style={styles.dessertChipText}>{meal.dessert}</Text>
              </View>
            )}

            {meal.dinner && (
              <>
                <View style={styles.mealDivider} />
                <View style={styles.mealSectionHeader}>
                  <MCI name="weather-night" size={13} color={colors.brand.secondary} />
                  <Text style={styles.mealSectionLabel}>JANTA</Text>
                </View>
                <Text style={styles.lunchName}>{meal.dinner}</Text>
                {meal.dinner_dessert && (
                  <View style={styles.dessertChip}>
                    <MCI name="ice-cream" size={13} color={colors.brand.secondary} />
                    <Text style={styles.dessertChipText}>{meal.dinner_dessert}</Text>
                  </View>
                )}
              </>
            )}

            <View style={styles.mealDivider} />

            {/* Seletor de membro — Resumo sempre primeiro */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.memberSelector}
            >
              <TouchableOpacity
                style={[styles.memberPill, activeMember === 'resumo' && styles.memberPillActive]}
                onPress={() => setActiveMember('resumo')}
                activeOpacity={0.7}
              >
                <Text style={[styles.memberPillText, activeMember === 'resumo' && styles.memberPillTextActive]}>
                  Resumo
                </Text>
              </TouchableOpacity>
              {memberNames.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={[styles.memberPill, activeMember === name && styles.memberPillActive]}
                  onPress={() => setActiveMember(name)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.memberPillText, activeMember === name && styles.memberPillTextActive]}>
                    {name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {activeMember === 'resumo' ? (
              <View style={styles.portionList}>
                {dailyRows.map((row) => (
                  <PortionRow key={row.name} name={row.name} portion={row} />
                ))}
              </View>
            ) : (
              <View style={styles.portionList}>
                {selectedBreakfast && (
                  <MemberMealRow label="Café" icon="coffee-outline" portion={selectedBreakfast} />
                )}
                {selectedLunch && (
                  <MemberMealRow
                    label="Almoço"
                    icon="silverware-fork-knife"
                    portion={selectedLunch}
                    note={selectedAltLunch}
                  />
                )}
                {selectedDinner && (
                  <MemberMealRow label="Janta" icon="weather-night" portion={selectedDinner} />
                )}
              </View>
            )}

            <View style={styles.macroLegend}>
              <Text style={styles.macroLegendText}>P = Proteína · C = Carboidrato · V = Vegetal</Text>
            </View>

            <TouchableOpacity style={styles.prepButton} onPress={() => setShowPrep(true)} activeOpacity={0.7}>
              <Feather name="search" size={15} color={colors.brand.primary} />
              <Text style={styles.prepButtonText}>Ver modo de preparo</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <PrepModal meal={meal} weekStart={weekStart} visible={showPrep} onClose={() => setShowPrep(false)} />
    </>
  )
}

function PortionRow({ name, portion }: { name: string; portion: MealPortion }) {
  return (
    <View style={styles.portionRow}>
      <View style={styles.portionAvatar}>
        <Text style={styles.portionAvatarText}>{name[0].toUpperCase()}</Text>
      </View>
      <View style={styles.portionMeta}>
        <Text style={styles.portionName}>{name}</Text>
      </View>
      <Text style={styles.portionWeight}>{Math.round(portion.total_g)}g</Text>
      <View style={styles.portionBreakdown}>
        <Text style={styles.breakdownText}>
          P:{Math.round(portion.protein_g)}g · C:{Math.round(portion.carb_g)}g · V:{Math.round(portion.vegetable_g)}g
        </Text>
      </View>
    </View>
  )
}

function MemberMealRow({
  label,
  icon,
  portion,
  note,
}: {
  label: string
  icon: React.ComponentProps<typeof MCI>['name']
  portion: MealPortion
  note?: string
}) {
  return (
    <View style={styles.portionRow}>
      <View style={styles.portionAvatar}>
        <MCI name={icon} size={14} color={colors.brand.primary} />
      </View>
      <View style={styles.portionMeta}>
        <Text style={styles.portionName}>{label}</Text>
        {note && <Text style={styles.portionAltLunch}>{note}</Text>}
      </View>
      <Text style={styles.portionWeight}>{Math.round(portion.total_g)}g</Text>
      <View style={styles.portionBreakdown}>
        <Text style={styles.breakdownText}>
          P:{Math.round(portion.protein_g)}g · C:{Math.round(portion.carb_g)}g · V:{Math.round(portion.vegetable_g)}g
        </Text>
      </View>
    </View>
  )
}

function PrepModal({ meal, weekStart, visible, onClose }: { meal: DailyMeal; weekStart: string; visible: boolean; onClose: () => void }) {
  type PrepTab = 'cafe' | 'almoco' | 'janta'
  const hasCafe = !!meal.breakfast
  const hasJanta = !!meal.dinner
  const needsTabs = hasCafe || hasJanta
  const [activeTab, setActiveTab] = useState<PrepTab>('almoco')
  const dayDate = getDayDate(meal.day, weekStart)

  useEffect(() => {
    if (visible) setActiveTab(hasCafe ? 'cafe' : 'almoco')
  }, [visible])

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
        <View style={styles.modalHeader}>
          <View style={styles.modalTitleBlock}>
            <Text style={styles.modalDay}>
              {dayDate ? `${meal.day.toUpperCase()} · ${dayDate}` : meal.day.toUpperCase()}
            </Text>
            {!needsTabs && <Text style={styles.modalTitle}>{meal.lunch}</Text>}
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Feather name="x" size={22} color={colors.text.muted} />
          </TouchableOpacity>
        </View>

        {needsTabs && (
          <View style={styles.prepTabBar}>
            {hasCafe && (
              <TouchableOpacity
                style={[styles.prepTab, activeTab === 'cafe' && styles.prepTabActive]}
                onPress={() => setActiveTab('cafe')}
                activeOpacity={0.7}
              >
                <MCI name="coffee-outline" size={13} color={activeTab === 'cafe' ? colors.text.inverse : colors.text.muted} />
                <Text style={[styles.prepTabText, activeTab === 'cafe' && styles.prepTabTextActive]}>Café</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.prepTab, activeTab === 'almoco' && styles.prepTabActive]}
              onPress={() => setActiveTab('almoco')}
              activeOpacity={0.7}
            >
              <MCI name="silverware-fork-knife" size={13} color={activeTab === 'almoco' ? colors.text.inverse : colors.text.muted} />
              <Text style={[styles.prepTabText, activeTab === 'almoco' && styles.prepTabTextActive]}>Almoço</Text>
            </TouchableOpacity>
            {hasJanta && (
              <TouchableOpacity
                style={[styles.prepTab, activeTab === 'janta' && styles.prepTabActive]}
                onPress={() => setActiveTab('janta')}
                activeOpacity={0.7}
              >
                <MCI name="weather-night" size={13} color={activeTab === 'janta' ? colors.text.inverse : colors.text.muted} />
                <Text style={[styles.prepTabText, activeTab === 'janta' && styles.prepTabTextActive]}>Janta</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
          {/* Café da manhã */}
          {activeTab === 'cafe' && (
            <>
              <Text style={styles.modalTitle}>{meal.breakfast}</Text>
              {meal.breakfast_instructions && meal.breakfast_instructions.length > 0 ? (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Modo de Preparo</Text>
                  {meal.breakfast_instructions.map((step, i) => (
                    <View key={i} style={styles.stepRow}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{i + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.prepEmptyNote}>
                  Sem instruções de preparo para o café da manhã neste cardápio.
                </Text>
              )}
            </>
          )}

          {/* Almoço */}
          {activeTab === 'almoco' && (
            <>
              {needsTabs && <Text style={styles.modalTitle}>{meal.lunch}</Text>}
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
            </>
          )}

          {/* Janta */}
          {activeTab === 'janta' && (
            <>
              <Text style={styles.modalTitle}>{meal.dinner}</Text>
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
              {meal.dinner_instructions && meal.dinner_instructions.length > 0 ? (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Modo de Preparo</Text>
                  {meal.dinner_instructions.map((step, i) => (
                    <View key={i} style={styles.stepRow}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{i + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.prepEmptyNote}>
                  Sem instruções de preparo da janta neste cardápio.
                </Text>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

function FeedbackModal({
  visible,
  isLoading,
  onClose,
  onSubmit,
}: {
  visible: boolean
  isLoading: boolean
  onClose: () => void
  onSubmit: (feedback: string) => void
}) {
  const [text, setText] = useState('')
  const [isRecording, setIsRecording] = useState(false)

  useSpeechRecognitionEvent('start', () => setIsRecording(true))
  useSpeechRecognitionEvent('end', () => setIsRecording(false))
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript ?? ''
    if (transcript && event.isFinal) {
      setText((prev) => (prev ? prev + ' ' + transcript : transcript))
    }
  })
  useSpeechRecognitionEvent('error', () => setIsRecording(false))

  async function handleMicPress() {
    if (isExpoGo) return
    if (isRecording) {
      ExpoSpeechRecognitionModule.stop()
      return
    }
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
    if (!granted) {
      Alert.alert('Permissão necessária', 'Permita o acesso ao microfone para usar o ditado.')
      return
    }
    ExpoSpeechRecognitionModule.start({ lang: 'pt-BR', interimResults: false, continuous: false })
  }

  function handleSubmit() {
    const trimmed = text.trim()
    if (trimmed) onSubmit(trimmed)
  }

  function handleClose() {
    if (isRecording) ExpoSpeechRecognitionModule.stop()
    setText('')
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
        <View style={styles.modalHeader}>
          <View style={styles.modalTitleBlock}>
            <Text style={styles.modalTitle}>Adaptar cardápio</Text>
          </View>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Feather name="x" size={22} color={colors.text.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.feedbackDesc}>
            Descreva o que quer mudar. Pode ser troca de ingrediente, dia específico, restrição nova ou qualquer ajuste — a IA adapta apenas o necessário.
          </Text>
          <View style={styles.feedbackInputRow}>
            <TextInput
              style={[styles.feedbackInput, styles.feedbackInputFlex]}
              value={text}
              onChangeText={setText}
              placeholder="Ex: Trocar frango por peixe na quarta. Sem glúten em toda a semana. Prefiro arroz integral..."
              placeholderTextColor={colors.text.muted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[styles.micButton, isRecording && styles.micButtonActive]}
              onPress={handleMicPress}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              <Feather
                name="mic"
                size={20}
                color={isRecording ? colors.text.inverse : colors.brand.primary}
              />
              {isRecording && <ActivityIndicator size="small" color={colors.text.inverse} style={{ marginTop: 4 }} />}
            </TouchableOpacity>
          </View>
          {isRecording && (
            <Text style={styles.recordingHint}>Ouvindo... Toque no microfone para parar.</Text>
          )}
          <View style={styles.feedbackButton}>
            <Button
              label={isLoading ? 'Gerando adaptação...' : 'Gerar adaptação'}
              onPress={handleSubmit}
              disabled={!text.trim() || isLoading}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

function PrintScopeModal({
  visible,
  meals,
  weekStart,
  onClose,
}: {
  visible: boolean
  meals: DailyMeal[]
  weekStart: string
  onClose: () => void
}) {
  const [isExporting, setIsExporting] = useState(false)

  async function handleExport(scopeDay?: string) {
    setIsExporting(true)
    try {
      const scopedMeals = scopeDay ? meals.filter((m) => m.day === scopeDay) : meals
      const html = buildMenuHtml(scopedMeals, weekStart)
      const filename = scopeDay
        ? `cardapio-${scopeDay.toLowerCase().replace(/\s+/g, '-')}.pdf`
        : 'cardapio-completo.pdf'
      await exportHtmlAsPdf(html, filename, 'Compartilhar cardápio')
      onClose()
    } catch (err: any) {
      console.error('[PDF Menu]', err)
      Alert.alert(
        err.message?.includes('disponível') ? 'Indisponível' : 'Erro',
        err.message ?? 'Não foi possível gerar o PDF.'
      )
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
        <View style={styles.modalHeader}>
          <View style={styles.modalTitleBlock}>
            <Text style={styles.modalTitle}>Imprimir cardápio</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} disabled={isExporting}>
            <Feather name="x" size={22} color={colors.text.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.feedbackDesc}>
            Cada refeição vira uma página, com modo de preparo e porções por pessoa.
          </Text>

          <TouchableOpacity
            style={styles.printOption}
            onPress={() => handleExport()}
            activeOpacity={0.7}
            disabled={isExporting}
          >
            <View style={styles.printOptionIcon}>
              <Feather name="printer" size={16} color={colors.brand.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.printOptionTitle}>Cardápio inteiro</Text>
              <Text style={styles.printOptionSubtitle}>
                {meals.length} {meals.length === 1 ? 'dia' : 'dias'}
              </Text>
            </View>
            {isExporting ? (
              <ActivityIndicator size="small" color={colors.brand.primary} />
            ) : (
              <Feather name="chevron-right" size={18} color={colors.text.muted} />
            )}
          </TouchableOpacity>

          <Text style={[styles.modalSectionTitle, styles.printSectionSpacer]}>Ou um dia específico</Text>

          {meals.map((meal) => {
            const dayDate = getDayDate(meal.day, weekStart)
            return (
              <TouchableOpacity
                key={meal.day}
                style={styles.printOption}
                onPress={() => handleExport(meal.day)}
                activeOpacity={0.7}
                disabled={isExporting}
              >
                <View style={styles.printOptionIcon}>
                  <MCI name="calendar-week-outline" size={16} color={colors.brand.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.printOptionTitle}>{meal.day}</Text>
                  {!!dayDate && <Text style={styles.printOptionSubtitle}>{dayDate}</Text>}
                </View>
                <Feather name="chevron-right" size={18} color={colors.text.muted} />
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

function AssemblySection({ meals, weekStart }: { meals: DailyMeal[]; weekStart: string }) {
  const members = Object.keys(meals[0]?.portions ?? {})
  const [selected, setSelected] = useState(members[0] ?? '')

  if (members.length === 0) return null

  const hasDinner = meals.some(
    (m) => !!m.dinner && !!m.dinner_portions && Object.keys(m.dinner_portions).length > 0
  )
  const hasBreakfast = meals.some(
    (m) => !!m.breakfast && !!m.breakfast_portions && Object.keys(m.breakfast_portions ?? {}).length > 0
  )
  const lunchTotal = meals.reduce((sum, m) => sum + (m.portions[selected]?.total_g ?? 0), 0)
  const dinnerTotal = hasDinner
    ? meals.reduce((sum, m) => sum + (m.dinner_portions?.[selected]?.total_g ?? 0), 0)
    : 0
  const breakfastTotal = hasBreakfast
    ? meals.reduce((sum, m) => sum + (m.breakfast_portions?.[selected]?.total_g ?? 0), 0)
    : 0
  const weekTotal = lunchTotal + dinnerTotal + breakfastTotal
  const mealCount = meals.length * (1 + (hasDinner ? 1 : 0) + (hasBreakfast ? 1 : 0))

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
            <Text style={styles.assemblyStatValue}>{mealCount}</Text>
            <Text style={styles.assemblyStatLabel}>marmitas</Text>
          </View>
          <View style={styles.assemblySeparator} />
          <View style={styles.assemblyStat}>
            <Text style={styles.assemblyStatValue}>{(weekTotal / 1000).toFixed(1)} kg</Text>
            <Text style={styles.assemblyStatLabel}>total na semana</Text>
          </View>
          <View style={styles.assemblySeparator} />
          <View style={styles.assemblyStat}>
            <Text style={styles.assemblyStatValue}>{mealCount > 0 ? Math.round(weekTotal / mealCount) : 0}g</Text>
            <Text style={styles.assemblyStatLabel}>média/marmita</Text>
          </View>
        </View>
      </View>

      {/* Marmitas por dia */}
      {meals.map((meal) => {
        const portion = meal.portions[selected]
        const dinnerPortion = meal.dinner_portions?.[selected]
        const breakfastPortion = meal.breakfast_portions?.[selected]
        if (!portion) return null
        return <ContainerCard key={meal.day} meal={meal} portion={portion} dinnerPortion={dinnerPortion} breakfastPortion={breakfastPortion} weekStart={weekStart} />
      })}
    </View>
  )
}

function ContainerCard({ meal, portion, dinnerPortion, breakfastPortion, weekStart }: {
  meal: DailyMeal; portion: MealPortion; dinnerPortion?: MealPortion; breakfastPortion?: MealPortion; weekStart: string
}) {
  const dayDate = getDayDate(meal.day, weekStart)
  const hasMultiple = !!dinnerPortion || !!breakfastPortion
  return (
    <View style={styles.containerCard}>
      <Text style={styles.containerDay}>
        {dayDate ? `${meal.day.toUpperCase()}  ·  ${dayDate}` : meal.day.toUpperCase()}
      </Text>

      {breakfastPortion && meal.breakfast && (
        <>
          <View style={styles.containerHeader}>
            <View style={styles.containerInfo}>
              <Text style={styles.containerRecipe}>{meal.breakfast}</Text>
            </View>
            <View style={styles.containerWeight}>
              <Text style={styles.containerWeightValue}>{Math.round(breakfastPortion.total_g)}g</Text>
              <Text style={styles.containerWeightLabel}>café</Text>
            </View>
          </View>
          <View style={styles.barsWrapper}>
            <ComponentBar label="Proteína" value={breakfastPortion.protein_g} total={breakfastPortion.total_g} color={colors.brand.accent} />
            <ComponentBar label="Carboidrato" value={breakfastPortion.carb_g} total={breakfastPortion.total_g} color={colors.brand.primary} />
            <ComponentBar label="Vegetal" value={breakfastPortion.vegetable_g} total={breakfastPortion.total_g} color={colors.brand.secondary} />
          </View>
          <View style={styles.mealDivider} />
        </>
      )}

      <View style={styles.containerHeader}>
        <View style={styles.containerInfo}>
          <Text style={styles.containerRecipe}>{meal.lunch}</Text>
        </View>
        <View style={styles.containerWeight}>
          <Text style={styles.containerWeightValue}>{Math.round(portion.total_g)}g</Text>
          <Text style={styles.containerWeightLabel}>{hasMultiple ? 'almoço' : '1 marmita'}</Text>
        </View>
      </View>
      <View style={styles.barsWrapper}>
        <ComponentBar label="Proteína" value={portion.protein_g} total={portion.total_g} color={colors.brand.accent} />
        <ComponentBar label="Carboidrato" value={portion.carb_g} total={portion.total_g} color={colors.brand.primary} />
        <ComponentBar label="Vegetal" value={portion.vegetable_g} total={portion.total_g} color={colors.brand.secondary} />
      </View>

      {dinnerPortion && meal.dinner && (
        <>
          <View style={styles.mealDivider} />
          <View style={styles.containerHeader}>
            <View style={styles.containerInfo}>
              <Text style={styles.containerRecipe}>{meal.dinner}</Text>
            </View>
            <View style={styles.containerWeight}>
              <Text style={styles.containerWeightValue}>{Math.round(dinnerPortion.total_g)}g</Text>
              <Text style={styles.containerWeightLabel}>janta</Text>
            </View>
          </View>
          <View style={styles.barsWrapper}>
            <ComponentBar label="Proteína" value={dinnerPortion.protein_g} total={dinnerPortion.total_g} color={colors.brand.accent} />
            <ComponentBar label="Carboidrato" value={dinnerPortion.carb_g} total={dinnerPortion.total_g} color={colors.brand.primary} />
            <ComponentBar label="Vegetal" value={dinnerPortion.vegetable_g} total={dinnerPortion.total_g} color={colors.brand.secondary} />
          </View>
        </>
      )}
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

function buildWeekRange(weekStart: string): string {
  const [year, month, day] = weekStart.split('-').map(Number)
  const monday = new Date(year, month - 1, day)
  const sunday = new Date(year, month - 1, day + 6)
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  return `${fmt(monday)} a ${fmt(sunday)}`
}

function buildShoppingHtml(items: ShoppingItem[], weekStart: string, skippedCount = 0): string {
  const range = buildWeekRange(weekStart)
  const total = items.reduce((sum, i) => sum + (i.price_estimate_brl ?? 0), 0)

  const categoryRows = SHOPPING_CATEGORIES.map((cat) => {
    const catItems = items.filter((i) => i.category === cat)
    if (catItems.length === 0) return ''
    const rows = catItems
      .map(
        (item) => `
        <div class="item-row">
          <span class="dot"></span>
          <span class="item-name">${item.name}</span>
          <span class="item-qty">${item.quantity}</span>
          ${item.price_estimate_brl > 0
            ? `<span class="item-price">R$&nbsp;${item.price_estimate_brl.toFixed(2).replace('.', ',')}</span>`
            : '<span class="item-price"></span>'}
        </div>`
      )
      .join('')
    return `<div class="category-title">${cat}</div>${rows}`
  }).join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @page { margin: 24px 28px; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, Helvetica, Arial, sans-serif;
      background-color: #F8F5EE;
      color: #4A5240;
      padding: 20px 16px 36px;
      font-size: 14px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      background-color: #556B2F;
      border-radius: 14px;
      padding: 22px 24px 18px;
      margin-bottom: 20px;
    }
    .app-name {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 5px;
      color: #F8F5EE;
    }
    .header-sub {
      font-size: 12px;
      color: #CCDABB;
      margin-top: 6px;
      letter-spacing: 0.3px;
    }
    .total-card {
      background-color: #FFFFFF;
      border: 1.5px solid #D4CBBF;
      border-radius: 12px;
      padding: 18px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }
    .total-left {}
    .total-label { font-size: 11px; color: #9BA38D; letter-spacing: 0.3px; }
    .total-disclaimer { font-size: 10px; color: #B5BDAA; margin-top: 4px; }
    .total-value {
      font-size: 30px;
      font-weight: 700;
      color: #556B2F;
      letter-spacing: -0.5px;
    }
    .category-title {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.5px;
      color: #556B2F;
      text-transform: uppercase;
      margin: 18px 0 6px;
      padding-bottom: 6px;
      border-bottom: 2px solid #556B2F;
    }
    .item-row {
      display: flex;
      align-items: center;
      padding: 9px 4px;
      border-bottom: 1px solid #EADFCF;
      gap: 8px;
    }
    .dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      background-color: #7B8D63;
      flex-shrink: 0;
    }
    .item-name { flex: 1; font-size: 13.5px; color: #2D3B1F; }
    .item-qty { font-size: 12px; color: #9BA38D; min-width: 48px; text-align: right; }
    .item-price {
      font-size: 12.5px;
      font-weight: 600;
      color: #C9775D;
      min-width: 72px;
      text-align: right;
    }
    .footer {
      margin-top: 32px;
      text-align: center;
      font-size: 10px;
      color: #B5BDAA;
      letter-spacing: 0.3px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="app-name">ROTINEIRA</div>
    <div class="header-sub">Lista de Compras &nbsp;·&nbsp; Semana de ${range}</div>
  </div>

  <div class="total-card">
    <div class="total-left">
      <div class="total-label">ESTIMATIVA TOTAL DA SEMANA</div>
      <div class="total-disclaimer">* Preços médios de supermercado</div>
      ${skippedCount > 0 ? `<div class="total-disclaimer" style="margin-top:2px;color:#9BA38D;">&#10003; ${skippedCount} ${skippedCount === 1 ? 'item já marcado' : 'itens já marcados'} não incluídos</div>` : ''}
    </div>
    <div class="total-value">R$&nbsp;${total.toFixed(2).replace('.', ',')}</div>
  </div>

  ${categoryRows}

  <div class="footer">Gerado pelo Rotineira · Planejamento de marmitas com IA</div>
</body>
</html>`
}

interface RecipePage {
  dayLabel: string
  mealLabel: string
  recipeName: string
  timeInfo?: string
  utensils?: string[]
  instructions?: string[]
  portions: Record<string, MealPortion>
  extra?: string
}

function buildMenuHtml(meals: DailyMeal[], weekStart: string): string {
  const pages: RecipePage[] = []

  meals.forEach((meal) => {
    const dayDate = getDayDate(meal.day, weekStart)
    const dayLabel = dayDate ? `${meal.day.toUpperCase()} · ${dayDate}` : meal.day.toUpperCase()

    if (meal.breakfast) {
      pages.push({
        dayLabel,
        mealLabel: 'Café da Manhã',
        recipeName: meal.breakfast,
        instructions: meal.breakfast_instructions,
        portions: meal.breakfast_portions ?? {},
      })
    }

    pages.push({
      dayLabel,
      mealLabel: 'Almoço',
      recipeName: meal.lunch,
      timeInfo: `${meal.prep_time_min ?? 0} min de preparo · ${meal.cook_time_min ?? 0} min de cozimento`,
      utensils: meal.utensils,
      instructions: meal.instructions,
      portions: meal.portions,
      extra: meal.dessert ? `Sobremesa: ${meal.dessert}` : undefined,
    })

    if (meal.dinner) {
      pages.push({
        dayLabel,
        mealLabel: 'Janta',
        recipeName: meal.dinner,
        utensils: meal.utensils,
        instructions: meal.dinner_instructions,
        portions: meal.dinner_portions ?? {},
        extra: meal.dinner_dessert ? `Sobremesa: ${meal.dinner_dessert}` : undefined,
      })
    }
  })

  const pagesHtml = pages
    .map((p, i) => {
      const portionsHtml = Object.keys(p.portions).length
        ? `
        <div class="section-title">Porções por pessoa</div>
        <div class="portions">
          ${Object.entries(p.portions)
            .map(
              ([name, portion]) => `
            <div class="portion-row">
              <span class="portion-name">${name}</span>
              <span class="portion-weight">${Math.round(portion.total_g)}g</span>
              <span class="portion-breakdown">P:${Math.round(portion.protein_g)}g · C:${Math.round(portion.carb_g)}g · V:${Math.round(portion.vegetable_g)}g</span>
            </div>`
            )
            .join('')}
        </div>`
        : ''

      const utensilsHtml = p.utensils?.length
        ? `
        <div class="section-title">Utensílios</div>
        <div class="chips">${p.utensils.map((u) => `<span class="chip">${u}</span>`).join('')}</div>`
        : ''

      const stepsHtml = p.instructions?.length
        ? `
        <div class="section-title">Modo de Preparo</div>
        <ol class="steps">${p.instructions.map((step) => `<li>${step}</li>`).join('')}</ol>`
        : '<div class="empty-note">Sem instruções de preparo cadastradas.</div>'

      return `
    <div class="page${i < pages.length - 1 ? ' page-break' : ''}">
      <div class="page-header">
        <div class="app-name">ROTINEIRA</div>
        <div class="page-day">${p.dayLabel} &nbsp;·&nbsp; ${p.mealLabel}</div>
      </div>
      <div class="recipe-title">${p.recipeName}</div>
      ${p.timeInfo ? `<div class="time-info">${p.timeInfo}</div>` : ''}
      ${utensilsHtml}
      ${portionsHtml}
      ${stepsHtml}
      ${p.extra ? `<div class="extra-note">${p.extra}</div>` : ''}
      <div class="footer">Gerado pelo Rotineira · Planejamento de marmitas com IA</div>
    </div>`
    })
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @page { margin: 24px 28px; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, Helvetica, Arial, sans-serif;
      color: #4A5240;
      font-size: 14px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page { padding: 12px 4px 32px; }
    .page-break { page-break-after: always; break-after: page; }
    .page-header {
      background-color: #556B2F;
      border-radius: 14px;
      padding: 18px 22px 14px;
      margin-bottom: 20px;
    }
    .app-name { font-size: 18px; font-weight: 800; letter-spacing: 4px; color: #F8F5EE; }
    .page-day { font-size: 11px; color: #CCDABB; margin-top: 6px; letter-spacing: 0.6px; text-transform: uppercase; }
    .recipe-title { font-size: 24px; font-weight: 700; color: #2D3B1F; margin-bottom: 6px; }
    .time-info { font-size: 12px; color: #9BA38D; margin-bottom: 16px; }
    .section-title {
      font-size: 10px; font-weight: 700; letter-spacing: 1.5px; color: #556B2F;
      text-transform: uppercase; margin: 18px 0 8px; padding-bottom: 6px;
      border-bottom: 2px solid #556B2F;
    }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip {
      font-size: 11.5px; color: #556B2F; background-color: rgba(85,107,47,0.08);
      border: 1px solid rgba(85,107,47,0.35); border-radius: 999px; padding: 4px 10px;
    }
    .portions { display: flex; flex-direction: column; gap: 10px; }
    .portion-row { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; border-bottom: 1px solid #EADFCF; padding-bottom: 8px; }
    .portion-name { font-size: 13.5px; font-weight: 600; color: #2D3B1F; min-width: 90px; }
    .portion-weight { font-size: 13px; font-weight: 700; color: #C9775D; }
    .portion-breakdown { font-size: 11.5px; color: #9BA38D; }
    .steps { padding-left: 20px; display: flex; flex-direction: column; gap: 10px; }
    .steps li { font-size: 13.5px; color: #2D3B1F; line-height: 1.5; padding-left: 4px; }
    .empty-note { font-size: 13px; color: #9BA38D; font-style: italic; margin-top: 12px; }
    .extra-note { margin-top: 16px; font-size: 12.5px; color: #C9775D; font-weight: 600; }
    .footer { margin-top: 32px; text-align: center; font-size: 10px; color: #B5BDAA; letter-spacing: 0.3px; }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`
}

const _CHECKED_KEY = (planId: string) => `shopping_checked_${planId}`

const _PERIOD_MULTIPLIER: Record<string, number> = { weekly: 1, biweekly: 2, monthly: 4 }

function ShoppingSection({
  items, weekStart, planId, budget, period,
}: {
  items: ShoppingItem[]
  weekStart: string
  planId: string
  budget: number | null
  period?: string
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set())

  useEffect(() => {
    AsyncStorage.getItem(_CHECKED_KEY(planId)).then((raw) => {
      if (raw) setChecked(new Set(JSON.parse(raw) as string[]))
    })
  }, [planId])

  function toggleItem(key: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      AsyncStorage.setItem(_CHECKED_KEY(planId), JSON.stringify([...next]))
      return next
    })
  }

  function clearChecked() {
    setChecked(new Set())
    AsyncStorage.removeItem(_CHECKED_KEY(planId))
  }

  const byCategory = SHOPPING_CATEGORIES.reduce<Record<string, ShoppingItem[]>>((acc, cat) => {
    acc[cat] = items.filter((i) => i.category === cat)
    return acc
  }, {} as Record<string, ShoppingItem[]>)

  const otherItems = items.filter((i) => !SHOPPING_CATEGORIES.includes(i.category as any))
  const _itemKey = (i: ShoppingItem) => `${i.category}_${i.name}`
  const total = items.reduce((sum, i) => sum + (i.price_estimate_brl ?? 0), 0)
  const remainingTotal = items
    .filter((i) => !checked.has(_itemKey(i)))
    .reduce((sum, i) => sum + (i.price_estimate_brl ?? 0), 0)
  const checkedCount = checked.size
  const effectiveBudget = budget ? budget * (_PERIOD_MULTIPLIER[period ?? 'weekly'] ?? 1) : null

  async function handleShare() {
    try {
      const uncheckedItems = items.filter((i) => !checked.has(_itemKey(i)))
      const skippedCount = items.length - uncheckedItems.length
      const html = buildShoppingHtml(uncheckedItems, weekStart, skippedCount)
      await exportHtmlAsPdf(html, 'lista-compras.pdf', 'Compartilhar lista de compras')
    } catch (err: any) {
      console.error('[PDF Share]', err)
      Alert.alert(
        err.message?.includes('disponível') ? 'Indisponível' : 'Erro',
        err.message ?? 'Não foi possível gerar o PDF.'
      )
    }
  }

  return (
    <View style={styles.section}>
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>
          {checkedCount > 0 ? 'Falta comprar' : 'Estimativa total da semana'}
        </Text>
        <Text style={styles.totalValue}>
          R$ {(checkedCount > 0 ? remainingTotal : total).toFixed(2).replace('.', ',')}
        </Text>
        {checkedCount > 0 && (
          <Text style={styles.totalOriginal}>
            Total original: R$ {total.toFixed(2).replace('.', ',')}
          </Text>
        )}
        {effectiveBudget !== null && (
          <Text style={styles.budgetLabel}>
            Orçamento: R$ {effectiveBudget.toFixed(2).replace('.', ',')}
          </Text>
        )}
        <Text style={styles.totalDisclaimer}>* Baseado em preços médios de supermercado</Text>
        <View style={styles.totalActions}>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.7}>
            <Feather name="share-2" size={14} color={colors.brand.primary} />
            <Text style={styles.shareButtonText}>Compartilhar lista</Text>
          </TouchableOpacity>
          {checkedCount > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearChecked} activeOpacity={0.7}>
              <Feather name="x" size={13} color={colors.text.muted} />
              <Text style={styles.clearButtonText}>Limpar marcados ({checkedCount})</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {SHOPPING_CATEGORIES.map((cat) =>
        byCategory[cat].length > 0 ? (
          <CategorySection key={cat} title={cat} items={byCategory[cat]} checked={checked} onToggle={toggleItem} />
        ) : null
      )}
      {otherItems.length > 0 && (
        <CategorySection title="OUTROS" items={otherItems} checked={checked} onToggle={toggleItem} />
      )}
    </View>
  )
}

function CategorySection({
  title,
  items,
  checked,
  onToggle,
}: {
  title: string
  items: ShoppingItem[]
  checked: Set<string>
  onToggle: (key: string) => void
}) {
  return (
    <View style={styles.categorySection}>
      <Text style={styles.categoryTitle}>{title}</Text>
      {items.map((item, i) => {
        const key = `${item.category}_${item.name}`
        const isChecked = checked.has(key)
        return (
          <TouchableOpacity
            key={i}
            style={[styles.shoppingItem, isChecked && styles.shoppingItemChecked]}
            onPress={() => onToggle(key)}
            activeOpacity={0.7}
          >
            <Feather
              name={isChecked ? 'check-square' : 'square'}
              size={16}
              color={isChecked ? colors.brand.primary : colors.border.medium}
            />
            <Text style={[styles.shoppingName, isChecked && styles.shoppingNameChecked]}>
              {item.name}
            </Text>
            <Text style={[styles.shoppingQty, isChecked && styles.shoppingTextChecked]}>
              {item.quantity}
            </Text>
            {item.price_estimate_brl > 0 && (
              <Text style={[styles.shoppingPrice, isChecked && styles.shoppingTextChecked]}>
                R$ {item.price_estimate_brl.toFixed(2).replace('.', ',')}
              </Text>
            )}
          </TouchableOpacity>
        )
      })}
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

  // ── LoadingView animado ───────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['6'],
    gap: spacing['6'],
  },
  loadingLogo: {
    width: 140,
    height: 140,
  },
  stepsCard: {
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing['5'],
    gap: spacing['4'],
    width: '100%',
    ...shadow.card,
  },
  loadingStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
    minHeight: 24,
  },
  loadingStepIconCol: {
    width: 20,
    alignItems: 'center',
  },
  loadingStepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border.medium,
  },
  loadingStepLabel: {
    ...textStyles.body,
    color: colors.text.body,
    flex: 1,
  },
  loadingStepLabelActive: {
    fontFamily: fontFamily.semiBold,
    color: colors.brand.primary,
  },
  loadingStepLabelDone: {
    color: colors.text.muted,
    opacity: 0.5,
  },
  loadingStepLabelFuture: {
    opacity: 0.35,
  },
  loadingSubtitle: {
    ...textStyles.caption,
    color: colors.text.muted,
    textAlign: 'center',
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
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collapsedNames: {
    ...textStyles.caption,
    color: colors.text.muted,
    marginTop: 3,
    lineHeight: 18,
  },
  prepTabBar: {
    flexDirection: 'row',
    backgroundColor: colors.background.badge,
    marginHorizontal: spacing['6'],
    marginTop: spacing['3'],
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  prepTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing['2'],
    borderRadius: radius.sm,
  },
  prepTabActive: {
    backgroundColor: colors.brand.primary,
  },
  prepTabText: {
    ...textStyles.bodySmall,
    color: colors.text.muted,
  },
  prepTabTextActive: {
    fontFamily: fontFamily.semiBold,
    color: colors.text.inverse,
  },
  prepEmptyNote: {
    ...textStyles.body,
    color: colors.text.muted,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  mealDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing['1'],
  },
  mealSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mealSectionLabel: {
    ...textStyles.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.brand.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dessertChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing['2'],
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.brand.secondary + '14',
    borderWidth: 1,
    borderColor: colors.brand.secondary + '30',
  },
  dessertChipText: {
    ...textStyles.caption,
    color: colors.brand.secondary,
    fontFamily: fontFamily.semiBold,
  },
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
    alignItems: 'flex-start',
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
  portionMeta: { flex: 1, gap: 2 },
  portionName: { ...textStyles.bodySmall, fontFamily: fontFamily.semiBold, color: colors.text.body },
  portionAltLunch: { ...textStyles.caption, color: colors.brand.accent, fontFamily: fontFamily.semiBold },
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

  // Adaptar cardápio
  adaptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['2'],
    paddingVertical: spacing['3'],
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.brand.primary + '50',
    backgroundColor: colors.brand.primary + '0A',
    marginTop: spacing['2'],
  },
  adaptButtonText: {
    ...textStyles.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.brand.primary,
  },
  adaptHint: {
    ...textStyles.caption,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: -spacing['2'],
  },

  // Feedback modal
  feedbackDesc: {
    ...textStyles.body,
    color: colors.text.muted,
    lineHeight: 22,
    marginBottom: spacing['4'],
  },
  feedbackInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing['2'],
  },
  feedbackInputFlex: {
    flex: 1,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: radius.md,
    padding: spacing['4'],
    minHeight: 120,
    ...textStyles.body,
    color: colors.text.body,
    backgroundColor: colors.background.card,
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.card,
  },
  micButtonActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  recordingHint: {
    ...textStyles.caption,
    color: colors.brand.primary,
    marginTop: spacing['2'],
    textAlign: 'center',
  },
  feedbackButton: {
    marginTop: spacing['4'],
  },

  printSectionSpacer: { marginTop: spacing['2'] },
  printOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
    backgroundColor: colors.background.card,
    borderRadius: radius.md,
    padding: spacing['4'],
    marginBottom: spacing['2'],
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  printOptionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  printOptionTitle: { ...textStyles.bodySmall, fontFamily: fontFamily.semiBold, color: colors.text.heading },
  printOptionSubtitle: { ...textStyles.caption, color: colors.text.muted },

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
  totalOriginal: {
    ...textStyles.caption,
    color: colors.text.muted,
    textDecorationLine: 'line-through',
    textAlign: 'center',
  },
  totalDisclaimer: {
    ...textStyles.caption,
    color: colors.text.muted,
    textAlign: 'center',
  },
  budgetLabel: {
    ...textStyles.caption,
    color: colors.text.muted,
    textAlign: 'center',
  },
  totalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing['2'],
    marginTop: spacing['2'],
    justifyContent: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['2'],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.brand.primary + '40',
    backgroundColor: colors.background.screen,
  },
  shareButtonText: {
    ...textStyles.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.brand.primary,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['1'],
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['2'],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.screen,
  },
  clearButtonText: {
    ...textStyles.caption,
    color: colors.text.muted,
  },
  shoppingItemChecked: {
    opacity: 0.45,
  },
  shoppingNameChecked: {
    textDecorationLine: 'line-through',
  },
  shoppingTextChecked: {
    textDecorationLine: 'line-through',
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
