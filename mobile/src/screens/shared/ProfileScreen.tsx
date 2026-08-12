import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, StatusBar
} from 'react-native';
import {
  ArrowLeft, Star, Car, Phone, Mail,
  Edit, ChevronRight, Award, GraduationCap
} from 'lucide-react-native';
import { profileAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { getColors, spacing, fontSizes, radius, shadows, navy } from '../../utils/theme';

export default function ProfileScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'dark-content' : 'light-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Edit size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </Text>
          </View>
          <Text style={styles.name}>{user?.first_name} {user?.last_name}</Text>
          <View style={styles.roleBadge}>
            {user?.role === 'driver'
              ? <Car size={12} color="rgba(255,255,255,0.6)" />
              : <GraduationCap size={12} color="rgba(255,255,255,0.6)" />
            }
            <Text style={styles.roleText}>
              {user?.role === 'driver' ? 'Driver' : 'Student'}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile?.total_trips || 0}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            {profile?.rating_visible ? (
              <>
                <View style={styles.ratingRow}>
                  <Star size={16} color={colors.primary} fill={colors.primary} />
                  <Text style={styles.statValue}>{profile?.average_rating}</Text>
                </View>
                <Text style={styles.statLabel}>Rating</Text>
              </>
            ) : (
              <>
                <Text style={styles.statValue}>—</Text>
                <Text style={styles.statLabel}>
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
            <Phone size={16} color={colors.textMuted} />
            <Text style={styles.infoText}>{user?.phone_number}</Text>
          </View>
          {user?.email && (
            <View style={styles.infoRow}>
              <Mail size={16} color={colors.textMuted} />
              <Text style={styles.infoText}>{user?.email}</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsCard}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Edit size={18} color={colors.white} />
            <Text style={styles.actionText}>Edit Profile</Text>
            <ChevronRight size={16} color={'rgba(255,255,255,0.3)'} />
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate('Settings')}
          >
            <Award size={18} color={colors.white} />
            <Text style={styles.actionText}>Settings</Text>
            <ChevronRight size={16} color={'rgba(255,255,255,0.3)'} />
          </TouchableOpacity>
        </View>
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
  },
  backBtn: {
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
  editBtn: {
    width: 40, height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,184,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  avatarSection: { alignItems: 'center', marginBottom: spacing.lg },
  avatar: {
    width: 80, height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  // avatar's background is the fixed brand yellow in both themes, so its
  // initials are pinned to navy rather than colors.dark, which would invert
  // to near-white in dark mode and disappear against the still-yellow circle.
  avatarText: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: navy,
  },
  name: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  roleText: {
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  statCard: { flex: 1, alignItems: 'center' },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  statValue: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  actionsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  actionText: {
    flex: 1,
    fontSize: fontSizes.md,
    fontWeight: '600',
    // This screen's background is always the dark navy (colors.dark) by
    // fixed design, not tied to the app's dark-mode toggle — this was
    // using colors.dark for the text too, making it identical to its own
    // background (1:1 contrast, invisible). Every other label on this
    // screen already uses white/near-white; match that.
    color: colors.white,
  },
  actionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginLeft: spacing.lg + 18 + spacing.md,
  },
});