import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, TouchableWithoutFeedback, Alert,
} from 'react-native';
import {
  User, Clock, Wallet, Settings,
  LogOut, ChevronRight, Megaphone, Car, Repeat
} from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { getColors, spacing, fontSizes, radius, shadows } from '../utils/theme';
import { authAPI, driverRegistrationAPI } from '../services/api';

const { width } = Dimensions.get('window');
const MENU_WIDTH = width * 0.78;

interface Props {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

export default function SideMenu({ visible, onClose, navigation }: Props) {
  const { user, logout, setAuth } = useAuthStore();
  const { isDark } = useThemeStore();
  const c = getColors(isDark);
  const slideAnim = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [switchingRole, setSwitchingRole] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -MENU_WIDTH, duration: 220, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const navigate = (screen: string) => {
    onClose();
    setTimeout(() => navigation.navigate(screen), 250);
  };

  // A passenger applying to become a driver could be at any stage — never
  // applied, applied and waiting, or already approved but hasn't switched
  // modes yet — so route to wherever their existing application actually
  // is instead of always starting a fresh one.
  const handleBecomeDriver = async () => {
    onClose();
    try {
      const res = await driverRegistrationAPI.getStatus();
      const target = res.data.submission_date ? 'DriverPending' : 'DriverRegistration';
      setTimeout(() => navigation.navigate(target), 250);
    } catch (err) {
      // No drivers row yet — brand new application
      setTimeout(() => navigation.navigate('DriverRegistration'), 250);
    }
  };

  const handleLogout = () => {
    onClose();
    setTimeout(() => logout(), 250);
  };

  // This used to only live inside Settings, two taps deep from here — a
  // driver with no reason to go looking in Settings would have no way of
  // knowing a way back to passenger mode existed at all. Surfacing it
  // directly in the menu makes it visible the moment a driver opens it.
  const handleSwitchToStudent = () => {
    onClose();
    setTimeout(() => {
      Alert.alert(
        'Switch to Student Mode?',
        "You'll book rides instead of driving. You can switch back anytime.",
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Switch', onPress: async () => {
              if (switchingRole) return;
              setSwitchingRole(true);
              try {
                const res = await authAPI.switchRole('passenger');
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
    }, 250);
  };

  if (!visible) return null;

  const isDriver = user?.role === 'driver';

  const menuBg = isDark ? '#252542' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1A1A2E';
  const mutedColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,26,46,0.4)';
  const iconBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.06)';
  const dividerColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.08)';

  return (
    <View style={styles.overlay}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.menu, { backgroundColor: menuBg, transform: [{ translateX: slideAnim }] }]}>
        {/* Profile section */}
        <View style={[styles.profileSection, { borderBottomColor: dividerColor }]}>
          <TouchableOpacity onPress={() => navigate('Profile')} style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: c.primary }]}>
              <Text style={[styles.avatarText, { color: c.dark }]}>
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: textColor }]}>
                {user?.first_name} {user?.last_name}
              </Text>
              <Text style={[styles.profileRole, { color: mutedColor }]}>
                {isDriver ? 'Driver' : 'Student'}
              </Text>
            </View>
            <ChevronRight size={16} color={mutedColor} />
          </TouchableOpacity>
        </View>

        {/* Menu items */}
        <View style={styles.menuItems}>
          {[
            { icon: <User size={20} color={textColor} />, label: 'My Profile', screen: 'Profile' },
            { icon: <Clock size={20} color={textColor} />, label: 'Ride History', screen: 'RideHistory' },
            ...(isDriver ? [{ icon: <Wallet size={20} color={textColor} />, label: 'Earnings', screen: 'Earnings' }] : []),
            ...(isDriver ? [{ icon: <Repeat size={20} color={textColor} />, label: 'Switch to Student Mode', onPress: handleSwitchToStudent }] : []),
            ...(!isDriver ? [{ icon: <Car size={20} color={textColor} />, label: 'Become a Driver', onPress: handleBecomeDriver }] : []),
            { icon: <Megaphone size={20} color={textColor} />, label: 'Announcements', screen: 'Announcements' },
            { icon: <Settings size={20} color={textColor} />, label: 'Settings', screen: 'Settings' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuItem}
              onPress={() => item.onPress ? item.onPress() : navigate(item.screen!)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuItemIcon, { backgroundColor: iconBg }]}>{item.icon}</View>
              <Text style={[styles.menuItemLabel, { color: textColor }]}>{item.label}</Text>
              <ChevronRight size={16} color={mutedColor} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom */}
        <View style={[styles.bottom, { borderTopColor: dividerColor }]}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={18} color={c.error} />
            <Text style={[styles.logoutText, { color: c.error }]}>Logout</Text>
          </TouchableOpacity>
          <Text style={[styles.version, { color: mutedColor }]}>Campus Chauffeur v1.0</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  menu: {
    position: 'absolute',
    top: 0, left: 0, bottom: 0,
    width: MENU_WIDTH,
    paddingTop: 60,
  },
  profileSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    marginBottom: spacing.md,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 52, height: 52,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
  profileRole: {
    fontSize: fontSizes.xs,
    marginTop: 2,
  },
  menuItems: { flex: 1, paddingHorizontal: spacing.sm },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  menuItemIcon: {
    width: 36, height: 36,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemLabel: {
    flex: 1,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  bottom: {
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  logoutText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  version: {
    fontSize: fontSizes.xs,
    marginTop: spacing.md,
  },
});