import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, FlatList, ActivityIndicator, StatusBar
} from 'react-native';
import { ArrowLeft, Megaphone } from 'lucide-react-native';
import { useThemeStore } from '../../store/themeStore';
import { getColors, spacing, fontSizes, radius, shadows } from '../../utils/theme';
import { announcementsAPI } from '../../services/api';

export default function AnnouncementsScreen({ navigation }: any) {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors);
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
        <Megaphone size={16} color={colors.primary} />
        <Text style={styles.cardTitle}>{item.title}</Text>
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

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray2,
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.dark,
  },
  list: { padding: spacing.lg, gap: spacing.sm },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  cardTitle: {
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
