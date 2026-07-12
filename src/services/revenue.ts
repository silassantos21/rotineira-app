import { Platform } from 'react-native'
import { isExpoGo } from './notifications'
import type { PurchasesPackage, PurchasesOffering } from 'react-native-purchases'

const API_KEY = Platform.OS === 'ios'
  ? (process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? '')
  : (process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? '')

export function initRevenueCat(userId: string): void {
  if (!API_KEY || isExpoGo) return
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { default: Purchases, LOG_LEVEL } = require('react-native-purchases')
    Purchases.setLogLevel(LOG_LEVEL.ERROR)
    Purchases.configure({ apiKey: API_KEY })
    Purchases.logIn(userId).catch(() => {})
  } catch {
    // native module unavailable
  }
}

export async function checkIsPremium(): Promise<boolean> {
  if (!API_KEY || isExpoGo) return false
  try {
    const { default: Purchases } = require('react-native-purchases')
    const info = await Purchases.getCustomerInfo()
    return info.entitlements.active['premium'] !== undefined
  } catch {
    return false
  }
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!API_KEY || isExpoGo) return null
  try {
    const { default: Purchases } = require('react-native-purchases')
    const offerings = await Purchases.getOfferings()
    return offerings.current
  } catch {
    return null
  }
}

export async function purchasePackage(pkg: PurchasesPackage) {
  if (isExpoGo) throw Object.assign(new Error('preview'), { userCancelled: true })
  const { default: Purchases } = require('react-native-purchases')
  return Purchases.purchasePackage(pkg)
}

export async function restorePurchases() {
  if (isExpoGo) throw new Error('preview')
  const { default: Purchases } = require('react-native-purchases')
  return Purchases.restorePurchases()
}
