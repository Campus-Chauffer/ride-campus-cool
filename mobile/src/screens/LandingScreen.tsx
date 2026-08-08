import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Dimensions, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'react-native';
import { Car, GraduationCap } from 'lucide-react-native';
import { useThemeStore } from '../store/themeStore';
import { getColors, spacing, fontSizes, radius, shadows } from '../utils/theme';

const { height } = Dimensions.get('window');

export default function LandingScreen({ navigation }: any) {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors);
  const [selectedRole, setSelectedRole] = useState<'passenger' | 'driver' | null>(null);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top dark section */}
      <LinearGradient
        colors={['#000000', '#000000']}
        style={styles.topSection}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/cc-logo.jpg')}
            style={{ width: 80, height: 80, borderRadius: 20 }}
          />
          <Text style={styles.appName}>Campus Chauffeur</Text>
          <Text style={styles.tagline}>Safe rides around UG Legon</Text>
        </View>
      </LinearGradient>

      {/* Bottom white section */}
      <ScrollView
        style={styles.bottomSection}
        contentContainerStyle={styles.bottomContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Text style={styles.heading}>I am a...</Text>

        <TouchableOpacity
          style={[styles.roleCard, selectedRole === 'passenger' && styles.roleCardActive]}
          onPress={() => setSelectedRole('passenger')}
          activeOpacity={0.8}
        >
          <View style={[styles.roleIcon, selectedRole === 'passenger' && styles.roleIconActive]}>
            <GraduationCap
              size={24}
              color={selectedRole === 'passenger' ? colors.dark : colors.textMuted}
              strokeWidth={2}
            />
          </View>
          <View style={styles.roleText}>
            <Text style={styles.roleName}>Student</Text>
            <Text style={styles.roleDesc}>I need a ride around campus</Text>
          </View>
          <View style={[styles.radioOuter, selectedRole === 'passenger' && styles.radioOuterActive]}>
            {selectedRole === 'passenger' && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleCard, selectedRole === 'driver' && styles.roleCardActive]}
          onPress={() => setSelectedRole('driver')}
          activeOpacity={0.8}
        >
          <View style={[styles.roleIcon, selectedRole === 'driver' && styles.roleIconActive]}>
            <Car
              size={24}
              color={selectedRole === 'driver' ? colors.dark : colors.textMuted}
              strokeWidth={2}
            />
          </View>
          <View style={styles.roleText}>
            <Text style={styles.roleName}>Driver</Text>
            <Text style={styles.roleDesc}>I want to earn on campus</Text>
          </View>
          <View style={[styles.radioOuter, selectedRole === 'driver' && styles.radioOuterActive]}>
            {selectedRole === 'driver' && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.continueBtn, !selectedRole && styles.continueBtnDisabled]}
          disabled={!selectedRole}
          onPress={() => navigation.navigate('Login', { role: selectedRole || 'passenger' })}
          activeOpacity={0.9}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>

        <Text style={styles.terms}>
          By continuing you agree to our Terms of Service and Privacy Policy
        </Text>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark },
  topSection: {
    minHeight: height * 0.38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: { alignItems: 'center' },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,184,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,184,0,0.3)',
  },
  appName: {
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  tagline: {
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.3,
  },
  bottomSection: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: height * 0.65,
  },
  bottomContent: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  heading: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: spacing.md,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.gray2,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  roleCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFFBF0',
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  roleIconActive: {
    backgroundColor: colors.primary,
  },
  roleText: { flex: 1 },
  roleName: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: 2,
  },
  roleDesc: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.gray2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: { borderColor: colors.primary },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  continueBtn: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.md,
  },
  continueBtnDisabled: { opacity: 0.4 },
  continueBtnText: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.dark,
    letterSpacing: 0.3,
  },
  terms: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 18,
  },
});