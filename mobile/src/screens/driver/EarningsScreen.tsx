import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator,
  StatusBar, RefreshControl, Alert
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { ArrowLeft, Wallet, Clock, CheckCircle, TrendingUp, RefreshCw, Lock, Copy, Check, CreditCard } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { walletAPI } from '../../services/api';
import { useThemeStore } from '../../store/themeStore';
import { getColors, spacing, fontSizes, radius, navy, white, mutedWhite } from '../../utils/theme';

// Momo stays as a fallback alongside the Paystack button below (outage,
// or a driver who just prefers a direct transfer) rather than being
// replaced by it.
const MOMO_PHONE = '0534036293';
const MOMO_NETWORK = 'MTN';
const MOMO_ACCOUNT_NAME = 'JEFFREY MENSAH ADU-TUTU';

export default function EarningsScreen({ navigation }: any) {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors);
  const [wallet, setWallet] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [phoneCopied, setPhoneCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [payingWithPaystack, setPayingWithPaystack] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [walletRes, ledgerRes] = await Promise.all([
        walletAPI.getWallet(),
        walletAPI.getLedger(),
      ]);
      setWallet(walletRes.data);
      setLedger(ledgerRes.data);
    } catch (err) {
      console.log('Earnings error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => loadData(true), []);

  // Opens Paystack's hosted checkout for the driver's exact outstanding
  // balance. Reconciliation happens server-side via webhook once Paystack
  // confirms the charge, not here - there's an inherent gap between the
  // driver finishing payment in the browser and that webhook landing, so
  // the message on return sets the right expectation instead of the
  // screen just looking unchanged (or the driver assuming it failed and
  // trying to pay twice).
  const payWithPaystack = async () => {
    try {
      setPayingWithPaystack(true);
      const res = await walletAPI.initializePaystackPayment();
      const url = res.data?.authorization_url;
      if (!url) throw new Error('No checkout URL returned');
      await WebBrowser.openBrowserAsync(url);
      Alert.alert(
        'Payment submitted',
        "If your payment went through, this may take a moment to reflect here. Pull down to refresh, and your account will unlock automatically once it's processed."
      );
      loadData(true);
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Could not start Paystack checkout. Please try again.';
      Alert.alert('Payment error', message);
    } finally {
      setPayingWithPaystack(false);
    }
  };

  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
  }, []);

  const copyMomoNumber = async () => {
    await Clipboard.setStringAsync(MOMO_PHONE);
    setPhoneCopied(true);
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    copiedTimeoutRef.current = setTimeout(() => setPhoneCopied(false), 1500);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const commissionOwed = parseFloat(wallet?.commission_outstanding || wallet?.outstanding_balance || 0);
  const earnings = parseFloat(wallet?.earnings || 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed light-content, not tied to isDark — this screen's background
          is pinned to navy in both themes, so the status bar icons need to
          stay light/white regardless of the system setting. */}
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <RefreshCw size={18} color={mutedWhite(0.6)} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Earnings card */}
        <View style={styles.earningsCard}>
          <Wallet size={20} color={colors.success} />
          <Text style={styles.earningsValue}>
            GH₵{parseFloat(earnings.toFixed(2))}
          </Text>
          <Text style={styles.earningsLabel}>Total Earnings</Text>
          <Text style={styles.earningsSubtext}>
            After commission deductions
          </Text>
        </View>

        {/* Commission owed */}
        <View style={[
          styles.balanceCard,
          commissionOwed > 0 && styles.balanceCardWarning
        ]}>
          <View>
            <Text style={styles.balanceLabel}>Commission Owed</Text>
            <Text style={styles.balanceValue}>
              GH₵{parseFloat(wallet?.outstanding_balance || 0).toFixed(2)}
            </Text>
          </View>
          <View style={[
            styles.lockBadge,
            wallet?.is_locked ? styles.lockBadgeLocked : styles.lockBadgeUnlocked
          ]}>
            {wallet?.is_locked
              ? <Lock size={12} color={white} strokeWidth={2.5} />
              : <CheckCircle size={12} color={white} strokeWidth={2.5} />
            }
            <Text style={styles.lockBadgeText}>
              {wallet?.is_locked ? 'Locked' : 'Active'}
            </Text>
          </View>
        </View>

        {/* Pay with Paystack — the preferred, faster option; momo below
            stays as a fallback. */}
        {commissionOwed > 0 && (
          <TouchableOpacity
            style={styles.paystackBtn}
            onPress={payWithPaystack}
            disabled={payingWithPaystack}
            activeOpacity={0.8}
          >
            {payingWithPaystack ? (
              <ActivityIndicator color={navy} size="small" />
            ) : (
              <>
                <CreditCard size={16} color={navy} />
                <Text style={styles.paystackBtnText}>Pay with Paystack</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Momo payment details */}
        <View style={styles.momoCard}>
          <Text style={styles.momoLabel}>Pay commission to</Text>
          <Text style={styles.momoName}>{MOMO_ACCOUNT_NAME}</Text>
          <Text style={styles.momoNetwork}>{MOMO_NETWORK} Mobile Money</Text>
          <TouchableOpacity style={styles.momoPhoneRow} onPress={copyMomoNumber} activeOpacity={0.7}>
            <Text style={styles.momoPhone}>{MOMO_PHONE}</Text>
            {phoneCopied ? (
              <View style={styles.momoCopiedBadge}>
                <Check size={13} color={colors.success} strokeWidth={2.5} />
                <Text style={styles.momoCopiedText}>Copied</Text>
              </View>
            ) : (
              <Copy size={16} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Info box */}
        <View style={styles.infoBox}>
          <Clock size={14} color={mutedWhite(0.4)} />
          <Text style={styles.infoText}>
            Commission is collected daily at 4AM. Pay before then to stay active. Pull down to refresh after payment.
          </Text>
        </View>

        {/* Ledger */}
        <Text style={styles.sectionTitle}>Transaction History</Text>
        {ledger.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          ledger.map((item) => (
            <View key={item.id} style={styles.ledgerItem}>
              <View style={[
                styles.ledgerIcon,
                item.type === 'payment' ? styles.ledgerIconPayment : styles.ledgerIconCommission
              ]}>
                {item.type === 'payment'
                  ? <CheckCircle size={16} color={colors.success} />
                  : <TrendingUp size={16} color={colors.error} />
                }
              </View>
              <View style={styles.ledgerInfo}>
                <Text style={styles.ledgerDesc}>{item.description}</Text>
                {item.pickup_address && (
                  <Text style={styles.ledgerRoute} numberOfLines={1}>
                    {item.pickup_address} → {item.dropoff_address}
                  </Text>
                )}
                <Text style={styles.ledgerDate}>{formatDate(item.created_at)}</Text>
              </View>
              <Text style={[
                styles.ledgerAmount,
                item.type === 'payment' ? styles.ledgerAmountPositive : styles.ledgerAmountNegative
              ]}>
                {item.type === 'payment' ? '-' : '+'}GH₵{parseFloat(item.amount).toFixed(2)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: navy },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: mutedWhite(0.08),
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: radius.md,
    backgroundColor: mutedWhite(0.08),
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshBtn: {
    width: 40, height: 40,
    borderRadius: radius.md,
    backgroundColor: mutedWhite(0.08),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: white,
  },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  earningsCard: {
    backgroundColor: 'rgba(76,175,80,0.08)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.2)',
    gap: spacing.xs,
  },
  earningsValue: {
    fontSize: fontSizes.xxxl,
    fontWeight: '800',
    color: white,
  },
  earningsLabel: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.success,
  },
  earningsSubtext: {
    fontSize: fontSizes.xs,
    color: mutedWhite(0.3),
  },
  balanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: mutedWhite(0.05),
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: mutedWhite(0.08),
  },
  balanceCardWarning: {
    borderColor: 'rgba(244,67,54,0.3)',
    backgroundColor: 'rgba(244,67,54,0.08)',
  },
  balanceLabel: {
    fontSize: fontSizes.xs,
    color: mutedWhite(0.4),
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    color: white,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  lockBadgeLocked: { backgroundColor: 'rgba(244,67,54,0.2)' },
  lockBadgeUnlocked: { backgroundColor: 'rgba(76,175,80,0.2)' },
  lockBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: white,
  },
  paystackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  paystackBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: '800',
    color: navy,
  },
  momoCard: {
    backgroundColor: mutedWhite(0.05),
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: mutedWhite(0.08),
  },
  momoLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: mutedWhite(0.4),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  momoName: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: white,
  },
  momoNetwork: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
  },
  momoPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: mutedWhite(0.08),
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.md,
  },
  momoPhone: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    color: white,
    letterSpacing: 0.5,
  },
  momoCopiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  momoCopiedText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.success,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: mutedWhite(0.03),
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: fontSizes.xs,
    color: mutedWhite(0.4),
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: mutedWhite(0.4),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  emptyState: { alignItems: 'center', padding: spacing.xl },
  emptyText: { fontSize: fontSizes.sm, color: mutedWhite(0.3) },
  ledgerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: mutedWhite(0.04),
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  ledgerIcon: {
    width: 36, height: 36,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ledgerIconCommission: { backgroundColor: 'rgba(244,67,54,0.15)' },
  ledgerIconPayment: { backgroundColor: 'rgba(76,175,80,0.15)' },
  ledgerInfo: { flex: 1 },
  ledgerDesc: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: white,
    marginBottom: 2,
  },
  ledgerRoute: {
    fontSize: fontSizes.xs,
    color: mutedWhite(0.4),
    marginBottom: 2,
  },
  ledgerDate: { fontSize: fontSizes.xs, color: mutedWhite(0.3) },
  ledgerAmount: { fontSize: fontSizes.md, fontWeight: '800' },
  ledgerAmountPositive: { color: colors.success },
  ledgerAmountNegative: { color: colors.error },
});