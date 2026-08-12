import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Switch, StatusBar, Alert
} from 'react-native';
import {
  ArrowLeft, Bell, Moon, Shield,
  HelpCircle, LogOut, ChevronRight, Info, Repeat
} from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { getColors, spacing, fontSizes, radius, shadows } from '../../utils/theme';
import { authAPI, driverRegistrationAPI } from '../../services/api';

export default function SettingsScreen({ navigation }: any) {
  const { logout, user, setAuth } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const c = getColors(isDark);
  const [notifications, setNotifications] = useState(true);
  const [hasApprovedDriverProfile, setHasApprovedDriverProfile] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);

  useEffect(() => {
    if (user?.role === 'passenger') {
      driverRegistrationAPI.getStatus()
        .then((res) => setHasApprovedDriverProfile(res.data.approval_status === 'approved'))
        .catch(() => setHasApprovedDriverProfile(false));
    }
  }, [user?.role]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const handleSwitchRole = (newRole: 'passenger' | 'driver') => {
    Alert.alert(
      newRole === 'driver' ? 'Switch to Driver Mode?' : 'Switch to Student Mode?',
      newRole === 'driver'
        ? "You'll go online and start seeing ride requests instead of booking rides."
        : "You'll book rides instead of driving. You can switch back anytime.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch', onPress: async () => {
            setSwitchingRole(true);
            try {
              const res = await authAPI.switchRole(newRole);
              await setAuth(res.data.token, res.data.user);
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error || 'Could not switch mode');
            } finally {
              setSwitchingRole(false);
            }
          }
        },
      ]
    );
  };

  const Section = ({ title }: { title: string }) => (
    <Text style={[styles.sectionTitle, { color: c.textMuted }]}>{title}</Text>
  );

  const SettingRow = ({
    icon, label, toggle, toggleValue, onToggle, onPress, danger
  }: any) => (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      activeOpacity={toggle ? 1 : 0.7}
    >
      <View style={[styles.settingIcon, { backgroundColor: c.gray }, danger && { backgroundColor: 'rgba(244,67,54,0.1)' }]}>
        {icon}
      </View>
      <Text style={[styles.settingLabel, { color: danger ? c.error : c.dark }]}>
        {label}
      </Text>
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: c.gray2, true: c.primary }}
          thumbColor={c.white}
        />
      ) : (
        <ChevronRight size={16} color={c.gray3} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.offWhite }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { backgroundColor: c.white, borderBottomColor: c.gray2 }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: c.gray }]}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate(user?.role === 'driver' ? 'DriverHome' : 'StudentHome');
            }
          }}
        >
          <ArrowLeft size={22} color={c.dark} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.dark }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Section title="Preferences" />
        <View style={[styles.card, { backgroundColor: c.white }]}>
          <SettingRow
            icon={<Bell size={18} color={c.dark} />}
            label="Push Notifications"
            toggle
            toggleValue={notifications}
            onToggle={setNotifications}
          />
          <View style={[styles.rowDivider, { backgroundColor: c.gray2 }]} />
          <SettingRow
            icon={<Moon size={18} color={c.dark} />}
            label="Dark Mode"
            toggle
            toggleValue={isDark}
            onToggle={toggleTheme}
          />
        </View>

        <Section title="Support" />
        <View style={[styles.card, { backgroundColor: c.white }]}>
          <SettingRow
            icon={<HelpCircle size={18} color={c.dark} />}
            label="Help & FAQ"
            onPress={() => Alert.alert('Help', 'Contact support@campuschauffeur.com')}
          />
          <View style={[styles.rowDivider, { backgroundColor: c.gray2 }]} />
          <SettingRow
            icon={<Shield size={18} color={c.dark} />}
            label="Privacy Policy"
            onPress={() => navigation.navigate('Legal', { type: 'privacy' })}
          />
          <View style={[styles.rowDivider, { backgroundColor: c.gray2 }]} />
          <SettingRow
            icon={<Shield size={18} color={c.dark} />}
            label="Terms of Service"
            onPress={() => navigation.navigate('Legal', { type: 'terms' })}
          />
          <View style={[styles.rowDivider, { backgroundColor: c.gray2 }]} />
          <SettingRow
            icon={<Info size={18} color={c.dark} />}
            label="About Campus Chauffeur"
            onPress={() => Alert.alert('Campus Chauffeur', 'Version 1.0.0\nSafe rides around UG Legon')}
          />
        </View>

        <Section title="Account" />
        <View style={[styles.card, { backgroundColor: c.white }]}>
          {user?.role === 'driver' && (
            <>
              <SettingRow
                icon={<Repeat size={18} color={c.dark} />}
                label="Switch to Student Mode"
                onPress={() => !switchingRole && handleSwitchRole('passenger')}
              />
              <View style={[styles.rowDivider, { backgroundColor: c.gray2 }]} />
            </>
          )}
          {user?.role === 'passenger' && hasApprovedDriverProfile && (
            <>
              <SettingRow
                icon={<Repeat size={18} color={c.dark} />}
                label="Switch to Driver Mode"
                onPress={() => !switchingRole && handleSwitchRole('driver')}
              />
              <View style={[styles.rowDivider, { backgroundColor: c.gray2 }]} />
            </>
          )}
          <SettingRow
            icon={<LogOut size={18} color={c.error} />}
            label="Logout"
            onPress={handleLogout}
            danger
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
  },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  sectionTitle: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  settingIcon: {
    width: 36, height: 36,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    flex: 1,
    fontSize: fontSizes.md,
    fontWeight: '500',
  },
  rowDivider: {
    height: 1,
    marginLeft: spacing.md + 36 + spacing.md,
  },
});