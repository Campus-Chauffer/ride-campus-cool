import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator, Alert
} from 'react-native';
import { Clock, XCircle, LogOut, CheckCircle } from 'lucide-react-native';
import { authAPI, driverRegistrationAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { getColors, spacing, fontSizes, radius, navy, shadows } from '../../utils/theme';

export default function DriverPendingScreen({ navigation }: any) {
  const { logout, user, setAuth } = useAuthStore();
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  // An existing passenger applying to become a driver keeps role='passenger'
  // right up until they actually choose to switch modes — this screen is
  // reachable from either the original driver-signup stack (which doesn't
  // have that concept, role is 'driver' from the start) or the passenger
  // stack applying for the first time, and they need different behavior on
  // approval: the original flow auto-continues into DriverHome, but that
  // route doesn't exist in the passenger stack, and a passenger shouldn't
  // be dropped into driver mode without choosing to.
  const isPassengerApplying = user?.role === 'passenger';

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const res = await driverRegistrationAPI.getStatus();
      setStatus(res.data.approval_status);
      if (res.data.approval_status === 'approved' && !isPassengerApplying) {
        navigation.replace('DriverHome');
      }
    } catch (err) {
      console.log('Status check error:', err);
    } finally {
      setLoading(false);
    }
  };

  const switchToDriverMode = async () => {
    setSwitching(true);
    try {
      const res = await authAPI.switchRole('driver');
      await setAuth(res.data.token, res.data.user);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Could not switch to driver mode');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'dark-content' : 'light-content'} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => logout()}
        >
          <LogOut size={18} color='rgba(255,255,255,0.6)' />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {status === 'pending' && (
          <>
            <View style={styles.iconContainer}>
              <Clock size={48} color={colors.primary} />
            </View>
            <Text style={styles.title}>Application Submitted</Text>
            <Text style={styles.subtitle}>
              Your documents are being reviewed by our team. This usually takes 24-48 hours.
            </Text>
            <View style={styles.stepsCard}>
              <View style={styles.step}>
                <View style={[styles.stepDot, styles.stepDotDone]} />
                <Text style={styles.stepText}>Documents submitted</Text>
              </View>
              <View style={styles.stepLine} />
              <View style={styles.step}>
                <View style={[styles.stepDot, styles.stepDotActive]} />
                <Text style={styles.stepText}>Under review</Text>
              </View>
              <View style={styles.stepLine} />
              <View style={styles.step}>
                <View style={styles.stepDot} />
                <Text style={styles.stepText}>Account activated</Text>
              </View>
            </View>
            <Text style={styles.checkText}>
              We'll notify you once your account is approved
            </Text>
            {loading && (
              <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
            )}
          </>
        )}

        {status === 'approved' && isPassengerApplying && (
          <>
            <View style={styles.iconContainer}>
              <CheckCircle size={48} color={colors.success} />
            </View>
            <Text style={styles.title}>You're Approved!</Text>
            <Text style={styles.subtitle}>
              Your driver application has been approved. Switch to driver mode whenever you're ready to start earning — you can always switch back.
            </Text>
            <TouchableOpacity
              style={styles.switchBtn}
              onPress={switchToDriverMode}
              disabled={switching}
            >
              {switching
                ? <ActivityIndicator color={navy} />
                : <Text style={styles.switchBtnText}>Switch to Driver Mode</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.laterText}>Maybe later</Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'blocked' && (
          <>
            <View style={[styles.iconContainer, styles.iconError]}>
              <XCircle size={48} color={colors.error} />
            </View>
            <Text style={styles.title}>Application Rejected</Text>
            <Text style={styles.subtitle}>
              Unfortunately your application was not approved. Please contact support for more information.
            </Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    alignItems: 'flex-end',
  },
  logoutBtn: {
    width: 36, height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 100, height: 100,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,184,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.2)',
  },
  iconError: {
    backgroundColor: 'rgba(244,67,54,0.1)',
    borderColor: 'rgba(244,67,54,0.2)',
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.white,
    marginBottom: spacing.sm,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  stepsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '100%',
    marginBottom: spacing.lg,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepDot: {
    width: 12, height: 12,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  stepDotActive: { backgroundColor: colors.primary },
  stepDotDone: { backgroundColor: colors.success },
  stepLine: {
    width: 1, height: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginLeft: 5,
  },
  stepText: {
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  checkText: {
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },
  switchBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    marginTop: spacing.sm,
    ...shadows.md,
  },
  // switchBtn's background is the fixed brand yellow in both themes, so its
  // text is pinned to navy rather than colors.dark, which would invert to
  // near-white in dark mode and disappear against the still-yellow button.
  switchBtnText: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: navy,
  },
  laterText: {
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.4)',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});