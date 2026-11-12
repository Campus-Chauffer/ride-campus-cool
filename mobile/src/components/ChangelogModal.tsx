import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import { useThemeStore } from '../store/themeStore';
import { getColors, spacing, fontSizes, radius, navy, gradients, tintedShadow } from '../utils/theme';
import { appAPI } from '../services/api';

const SEEN_VERSION_KEY = 'seen_changelog_version';

// Shown once per changelog_version bump (set via the admin Config page),
// tracked locally per device — not tied to the account, so reinstalling or
// switching devices shows it again, same tradeoff UpdateModal already
// accepts for its own "seen this session" state.
export default function ChangelogModal() {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors, isDark);
  const [visible, setVisible] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [version, setVersion] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await appAPI.checkVersion();
        const changelog = res.data?.changelog;
        if (!changelog || changelog.version <= 0 || !changelog.items?.length) return;

        const seenVersion = parseInt((await AsyncStorage.getItem(SEEN_VERSION_KEY)) || '0', 10);
        if (changelog.version > seenVersion) {
          setItems(changelog.items);
          setVersion(changelog.version);
          setVisible(true);
        }
      } catch (err) {
        // Offline or backend hiccup — never block app usage over this.
      }
    })();
  }, []);

  const dismiss = async () => {
    setVisible(false);
    if (version != null) {
      await AsyncStorage.setItem(SEEN_VERSION_KEY, String(version)).catch(() => {});
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <LinearGradient
            colors={gradients.primaryCta}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconCircle}
          >
            <Sparkles size={28} color={navy} strokeWidth={2} />
          </LinearGradient>
          <Text style={styles.title}>What's New</Text>
          <View style={styles.list}>
            {items.map((item, i) => (
              <View key={i} style={styles.listRow}>
                <View style={styles.bullet} />
                <Text style={styles.listText}>{item}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.closeBtnShadowWrap} onPress={dismiss} activeOpacity={0.9}>
            <LinearGradient
              colors={gradients.primaryCta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>Got it</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(10,10,20,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  card: {
    width: '100%', maxWidth: 340, backgroundColor: colors.white,
    borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center',
    ...tintedShadow(navy, isDark ? 0 : 0.3),
  },
  iconCircle: {
    width: 60, height: 60, borderRadius: radius.full,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
    ...tintedShadow(colors.primaryDark, isDark ? 0 : 0.35),
  },
  title: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.dark, marginBottom: spacing.md, textAlign: 'center', letterSpacing: -0.3 },
  list: { width: '100%', marginBottom: spacing.lg },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  bullet: { width: 6, height: 6, borderRadius: radius.full, backgroundColor: colors.primary, marginTop: 7 },
  listText: { flex: 1, fontSize: fontSizes.sm, color: colors.textMuted, lineHeight: 20 },
  closeBtnShadowWrap: { width: '100%', borderRadius: radius.full, ...tintedShadow(colors.primaryDark, isDark ? 0 : 0.3) },
  closeBtn: { width: '100%', padding: spacing.md, borderRadius: radius.full, alignItems: 'center' },
  closeBtnText: { fontSize: fontSizes.md, fontWeight: '700', color: navy, letterSpacing: 0.3 },
});
