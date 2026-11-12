import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import {
  ArrowLeft, Star, Car, Phone, Mail,
  Edit, ChevronRight, SlidersHorizontal, GraduationCap, Gift, Check
} from 'lucide-react-native';
import { profileAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import {
  getColors, spacing, fontSizes, radius, shadows, navy,
  mutedOnDark, androidTopPadding, gradients, tintedShadow,
} from '../../utils/theme';

export default function ProfileScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors, isDark);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
  }, []);
  const copyReferralCode = async () => {
    if (!user?.referral_code) return;
    await Clipboard.setStringAsync(user.referral_code);
    setCodeCopied(true);
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    copiedTimeoutRef.current = setTimeout(() => setCodeCopied(false), 1500);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await profileAPI.getProfile(user!.id);
      setProfile(res.data);
    } catch (err) {
      console.log('Profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'dark-content' : 'light-content'} />

      <LinearGradient
        colors={isDark ? gradients.navyCardDark : gradients.navyCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroTopRow}>
          <TouchableOpacity style={styles.heroIconBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.heroEyebrow}>Profile</Text>
          <TouchableOpacity
            style={styles.heroIconBtn}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Edit size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{user?.first_name} {user?.last_name}</Text>
            <View style={styles.roleBadge}>
              {user?.role === 'driver'
                ? <Car size={11} color={colors.primary} />
                : <GraduationCap size={11} color={colors.primary} />
              }
              <Text style={styles.roleText}>
                {user?.role === 'driver' ? 'Driver' : 'Student'}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollBg} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Stats — deliberately overlaps the hero's bottom edge, the one
            place this screen borrows the "card floats over the header"
            move from the passenger/driver home screens, for continuity. */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile?.total_trips || 0}</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            {profile?.rating_visible ? (
              <>
                <View style={styles.ratingRow}>
                  <Star size={15} color={colors.primary} fill={colors.primary} />
                  <Text style={styles.statValue}>{profile?.average_rating}</Text>
                </View>
                <Text style={styles.statLabel}>Rating</Text>
              </>
            ) : (
              <>
                <Text style={styles.statValue}>—</Text>
                <Text style={styles.statLabel} numberOfLines={2}>
                  {5 - (profile?.total_trips || 0)} trips to unlock
                </Text>
              </>
            )}
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile?.total_ratings || 0}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Phone size={16} color={colors.textDark} />
            </View>
            <Text style={styles.infoText}>{user?.phone_number}</Text>
          </View>
          {user?.email && (
            <>
              <View style={styles.rowDivider} />
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Mail size={16} color={colors.textDark} />
                </View>
                <Text style={styles.infoText}>{user?.email}</Text>
              </View>
            </>
          )}
        </View>

        {/* Referral code */}
        {user?.referral_code && (
          <View style={styles.referralCard}>
            <View style={styles.referralIcon}>
              <Gift size={18} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.referralLabel}>Your referral code</Text>
              <Text style={styles.referralCode}>{user.referral_code}</Text>
            </View>
            <TouchableOpacity style={styles.referralCopyBtn} onPress={copyReferralCode} activeOpacity={0.7}>
              {codeCopied
                ? <Check size={16} color={colors.primaryDark} />
                : <Text style={styles.referralCopyText}>Copy</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsCard}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primary + '1F' }]}>
              <Edit size={16} color={colors.primaryDark} />
            </View>
            <Text style={styles.actionText}>Edit Profile</Text>
            <ChevronRight size={16} color={mutedOnDark(isDark, 0.25)} />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <SlidersHorizontal size={16} color={colors.textDark} />
            </View>
            <Text style={styles.actionText}>Settings</Text>
            <ChevronRight size={16} color={mutedOnDark(isDark, 0.25)} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  // Matches the hero's own backdrop (colors.dark), not the page's offWhite
  // — SafeAreaView's top inset reservation on iOS shows whatever
  // background sits behind it, and since the hero is a child rendered
  // below that inset, a lighter container color here left a visible gray
  // gap above the hero instead of it reading as one continuous navy
  // surface behind the status bar. The actual page background now lives
  // on the ScrollView itself (scrollBg, below).
  container: { flex: 1, backgroundColor: colors.dark, paddingTop: androidTopPadding },
  loadingContainer: { flex: 1, backgroundColor: colors.dark, paddingTop: androidTopPadding },
  scrollBg: { flex: 1, backgroundColor: colors.offWhite },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl + spacing.sm,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
    overflow: 'hidden',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroIconBtn: {
    width: 40, height: 40,
    borderRadius: radius.md,
    backgroundColor: mutedOnDark(isDark, 0.1),
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroEyebrow: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: mutedOnDark(isDark, 0.5),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  avatar: {
    width: 68, height: 68,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: mutedOnDark(isDark, 0.12),
  },
  // avatar's background is the fixed brand yellow in both themes, so its
  // initials are pinned to navy rather than colors.dark, which would invert
  // to near-white in dark mode and disappear against the still-yellow circle.
  avatarText: { fontSize: fontSizes.lg, fontWeight: '800', color: navy },
  name: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.white, letterSpacing: -0.3 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '26',
    borderWidth: 1,
    borderColor: colors.primary + '40',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginTop: spacing.xs,
  },
  roleText: { fontSize: fontSizes.xs, color: colors.primary, fontWeight: '700' },

  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    marginTop: -spacing.xl,
    marginBottom: spacing.md,
    ...tintedShadow(navy, isDark ? 0 : 0.1),
    ...(isDark ? shadows.md : null),
  },
  statCard: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: mutedOnDark(isDark, 0.08) },
  statValue: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.textDark, marginBottom: 4 },
  statLabel: { fontSize: fontSizes.xs, color: colors.gray3, textAlign: 'center', fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  infoCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  referralCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  referralIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.primary + '1F',
    justifyContent: 'center', alignItems: 'center',
  },
  referralLabel: { fontSize: fontSizes.xs, color: colors.textMuted, fontWeight: '600' },
  referralCode: { fontSize: fontSizes.md, color: colors.textDark, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  referralCopyBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.offWhite,
    minWidth: 48, alignItems: 'center', justifyContent: 'center',
  },
  referralCopyText: { fontSize: fontSizes.xs, color: colors.primaryDark, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  infoIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.offWhite,
    justifyContent: 'center', alignItems: 'center',
  },
  infoText: { fontSize: fontSizes.sm, color: colors.textDark, fontWeight: '600' },
  rowDivider: { height: 1, backgroundColor: colors.gray, marginLeft: spacing.md + 36 + spacing.md },

  actionsCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    ...shadows.sm,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  actionIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.offWhite,
    justifyContent: 'center', alignItems: 'center',
  },
  actionText: { flex: 1, fontSize: fontSizes.md, fontWeight: '600', color: colors.textDark },
});
