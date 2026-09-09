import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform, Linking } from 'react-native';
import * as Application from 'expo-application';
import { ArrowUpCircle } from 'lucide-react-native';
import { useThemeStore } from '../store/themeStore';
import { getColors, spacing, fontSizes, radius, shadows, navy } from '../utils/theme';
import { appAPI } from '../services/api';

// Dismissible by design — "Later" just closes it for this app session. It
// reappears on the next cold launch (this component remounts with App.tsx)
// as long as the installed build is still behind ios/android_latest_build
// in the config table, so it never blocks anyone but keeps nudging.
export default function UpdateModal() {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors);
  const [visible, setVisible] = useState(false);
  const [updateUrl, setUpdateUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await appAPI.checkVersion();
        const platformInfo = Platform.OS === 'ios' ? res.data.ios : res.data.android;
        if (!platformInfo?.updateUrl) return;

        const myBuild = parseInt(Application.nativeBuildVersion || '0', 10);
        if (myBuild > 0 && myBuild < platformInfo.latestBuild) {
          setUpdateUrl(platformInfo.updateUrl);
          setVisible(true);
        }
      } catch (err) {
        // Offline or backend hiccup — never block app usage over this.
      }
    })();
  }, []);

  const handleUpdate = () => {
    if (updateUrl) Linking.openURL(updateUrl);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <ArrowUpCircle size={32} color={navy} strokeWidth={2} />
          </View>
          <Text style={styles.title}>Update available</Text>
          <Text style={styles.subtitle}>
            A newer version of Campus Chauffeur is ready, with the latest fixes and improvements.
          </Text>
          <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate} activeOpacity={0.9}>
            <Text style={styles.updateBtnText}>Update Now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.laterBtn} onPress={() => setVisible(false)}>
            <Text style={styles.laterBtnText}>Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  card: { width: '100%', maxWidth: 340, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', ...shadows.md },
  iconCircle: {
    width: 64, height: 64, borderRadius: radius.full,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.dark, marginBottom: spacing.xs, textAlign: 'center' },
  subtitle: { fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg },
  updateBtn: { width: '100%', backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.full, alignItems: 'center', marginBottom: spacing.sm },
  updateBtnText: { fontSize: fontSizes.md, fontWeight: '700', color: navy, letterSpacing: 0.3 },
  laterBtn: { padding: spacing.sm },
  laterBtnText: { fontSize: fontSizes.sm, color: colors.textMuted, fontWeight: '600' },
});
