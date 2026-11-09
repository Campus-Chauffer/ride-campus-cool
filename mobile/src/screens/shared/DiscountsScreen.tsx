import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, StatusBar,
  TextInput, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Tag, Check } from 'lucide-react-native';
import { useThemeStore } from '../../store/themeStore';
import { getColors, spacing, fontSizes, radius, navy, androidTopPadding, gradients, tintedShadow } from '../../utils/theme';
import { discountAPI } from '../../services/api';
import { useDiscountStore } from '../../store/discountStore';

const REASON_LABELS: Record<string, string> = {
  sold_out: 'Fully redeemed',
  expired: 'Expired',
  used: "You've used this",
  deactivated: 'No longer active',
};

function describeCode(item: any): string {
  const value = item.type === 'percent' ? `${parseFloat(item.value)}% off` : `₵${parseFloat(item.value).toFixed(2)} off`;
  const parts = [value];
  if (item.min_fare_condition) parts.push(`rides over ₵${parseFloat(item.min_fare_condition).toFixed(0)}`);
  if (item.time_condition) parts.push(`${item.time_condition} only`);
  return parts.join(' · ');
}

export default function DiscountsScreen({ navigation }: any) {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors, isDark);
  const { selectedCodeString, setSelectedCode, setManualCode, clear } = useDiscountStore();

  const [active, setActive] = useState<any[]>([]);
  const [unavailable, setUnavailable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualEntry, setManualEntry] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await discountAPI.getAvailable();
      setActive(res.data.active || []);
      setUnavailable(res.data.unavailable || []);
    } catch (err) {
      console.log('Discounts load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const useCode = (item: any) => {
    setSelectedCode(item);
    Alert.alert('Code selected', `${item.code} will be applied to your next ride if eligible.`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  const applyManualCode = () => {
    if (!manualEntry.trim()) return;
    setManualCode(manualEntry);
    Alert.alert('Code entered', `${manualEntry.trim().toUpperCase()} will be checked when you request your next ride.`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Discounts</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.list}>
                {selectedCodeString && (
                  <View style={styles.appliedBanner}>
                    <Text style={styles.appliedBannerText}>
                      {selectedCodeString} selected for your next ride
                    </Text>
                    <TouchableOpacity onPress={clear}>
                      <Text style={styles.appliedBannerClear}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.manualRow}>
                  <TextInput
                    style={styles.manualInput}
                    placeholder="Have a code? Enter it here"
                    placeholderTextColor={colors.gray3}
                    autoCapitalize="characters"
                    value={manualEntry}
                    onChangeText={setManualEntry}
                  />
                  <TouchableOpacity onPress={applyManualCode} activeOpacity={0.88}>
                    <LinearGradient
                      colors={gradients.primaryCta}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.manualBtn}
                    >
                      <Text style={styles.manualBtnText}>Apply</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionLabel}>Available to you</Text>
                {active.length === 0 ? (
                  <Text style={styles.emptyText}>No active codes right now</Text>
                ) : (
                  active.map((item) => (
                    <View key={item.id} style={styles.card}>
                      <View style={styles.cardIcon}>
                        <Tag size={16} color={colors.primary} />
                      </View>
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardCode}>{item.code}</Text>
                        <Text style={styles.cardDesc}>{describeCode(item)}</Text>
                        {item.max_uses != null && (
                          <Text style={styles.cardStock}>
                            {Math.max(0, item.max_uses - item.uses_count)} of {item.max_uses} left
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity style={styles.useBtn} onPress={() => useCode(item)}>
                        {selectedCodeString === item.code
                          ? <Check size={16} color={navy} />
                          : <Text style={styles.useBtnText}>Use</Text>}
                      </TouchableOpacity>
                    </View>
                  ))
                )}

                {unavailable.length > 0 && (
                  <>
                    <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>Expired / used</Text>
                    {unavailable.map((item) => (
                      <View key={item.id} style={[styles.card, styles.cardDisabled]}>
                        <View style={[styles.cardIcon, styles.cardIconDisabled]}>
                          <Tag size={16} color={colors.textMuted} />
                        </View>
                        <View style={styles.cardInfo}>
                          <Text style={[styles.cardCode, styles.textMuted]}>{item.code}</Text>
                          <Text style={styles.cardDesc}>{describeCode(item)}</Text>
                        </View>
                        <Text style={styles.reasonText}>{REASON_LABELS[item.reason] || ''}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite, paddingTop: androidTopPadding },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.offWhite,
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...tintedShadow(navy, isDark ? 0 : 0.08),
  },
  headerTitle: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.dark, letterSpacing: -0.3 },
  list: { padding: spacing.lg, gap: spacing.sm },
  appliedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary + '22',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  appliedBannerText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.dark, flex: 1 },
  appliedBannerClear: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.error },
  manualRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  manualInput: {
    flex: 1,
    backgroundColor: colors.offWhite,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSizes.sm,
    color: colors.dark,
  },
  manualBtn: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  manualBtnText: { fontSize: fontSizes.sm, fontWeight: '700', color: navy },
  sectionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  emptyText: { fontSize: fontSizes.sm, color: colors.textMuted, marginBottom: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...tintedShadow(navy, isDark ? 0 : 0.1),
  },
  cardDisabled: { opacity: 0.55 },
  cardIcon: {
    width: 36, height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.offWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconDisabled: {},
  cardInfo: { flex: 1 },
  cardCode: { fontSize: fontSizes.md, fontWeight: '800', color: colors.dark, letterSpacing: 0.5 },
  textMuted: { color: colors.textMuted },
  cardDesc: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  cardStock: { fontSize: fontSizes.xs, color: colors.primary, fontWeight: '600', marginTop: 2 },
  useBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    width: 44,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  useBtnText: { fontSize: fontSizes.xs, fontWeight: '700', color: navy },
  reasonText: { fontSize: fontSizes.xs, color: colors.textMuted, fontWeight: '600' },
});
