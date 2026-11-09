import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, FlatList, ActivityIndicator, StatusBar
} from 'react-native';
import { ArrowLeft, Megaphone } from 'lucide-react-native';
import { useThemeStore } from '../../store/themeStore';
import { getColors, spacing, fontSizes, radius, navy, androidTopPadding, tintedShadow } from '../../utils/theme';
import { announcementsAPI } from '../../services/api';

export default function AnnouncementsScreen({ navigation }: any) {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors, isDark);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await announcementsAPI.getAll();
      setAnnouncements(res.data);
    } catch (err) {
      console.log('Announcements error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Megaphone size={15} color={colors.primaryDark} />
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
      </View>
      <Text style={styles.cardBody}>{item.body}</Text>
      <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Announcements</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      ) : announcements.length === 0 ? (
        <View style={styles.emptyState}>
          <Megaphone size={48} color={colors.gray2} />
          <Text style={styles.emptyTitle}>No announcements yet</Text>
          <Text style={styles.emptySubtitle}>Updates from Campus Chauffeur will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={announcements}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    color: colors.dark,
    letterSpacing: -0.3,
  },
  list: { padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.md,
    ...tintedShadow(navy, isDark ? 0 : 0.1),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardIcon: {
    width: 30, height: 30, borderRadius: radius.sm + 2,
    backgroundColor: colors.primary + '1F',
    justifyContent: 'center', alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.dark,
  },
  cardBody: {
    fontSize: fontSizes.sm,
    color: colors.textDark,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  cardDate: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.dark,
  },
  emptySubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
