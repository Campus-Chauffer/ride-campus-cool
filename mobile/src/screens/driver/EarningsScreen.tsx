import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator,
  StatusBar, RefreshControl
} from 'react-native';
import { ArrowLeft, Wallet, Clock, CheckCircle, TrendingUp, RefreshCw, Lock } from 'lucide-react-native';
import { walletAPI } from '../../services/api';
import { useThemeStore } from '../../store/themeStore';
import { getColors, spacing, fontSizes, radius } from '../../utils/theme';

export default function EarningsScreen({ navigation }: any) {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors);
  const [wallet, setWallet] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      <StatusBar barStyle={isDark ? 'dark-content' : 'light-content'} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <RefreshCw size={18} color='rgba(255,255,255,0.6)' />
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
              ? <Lock size={12} color={colors.white} strokeWidth={2.5} />
              : <CheckCircle size={12} color={colors.white} strokeWidth={2.5} />
            }
            <Text style={styles.lockBadgeText}>
              {wallet?.is_locked ? 'Locked' : 'Active'}
            </Text>
          </View>
        </View>

        {/* Info box */}
        <View style={styles.infoBox}>
          <Clock size={14} color={colors.textMuted} />
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
  container: { flex: 1, backgroundColor: colors.dark },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshBtn: {
    width: 40, height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.white,
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
    color: colors.white,
  },
  earningsLabel: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.success,
  },
  earningsSubtext: {
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.3)',
  },
  balanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  balanceCardWarning: {
    borderColor: 'rgba(244,67,54,0.3)',
    backgroundColor: 'rgba(244,67,54,0.08)',
  },
  balanceLabel: {
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    color: colors.white,
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
    color: colors.white,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  emptyState: { alignItems: 'center', padding: spacing.xl },
  emptyText: { fontSize: fontSizes.sm, color: 'rgba(255,255,255,0.3)' },
  ledgerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
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
    color: colors.white,
    marginBottom: 2,
  },
  ledgerRoute: {
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 2,
  },
  ledgerDate: { fontSize: fontSizes.xs, color: 'rgba(255,255,255,0.3)' },
  ledgerAmount: { fontSize: fontSizes.md, fontWeight: '800' },
  ledgerAmountPositive: { color: colors.success },
  ledgerAmountNegative: { color: colors.error },
});