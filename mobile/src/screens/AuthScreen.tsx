import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator,
  Alert, StatusBar, KeyboardAvoidingView, Platform
} from 'react-native';
import { ArrowLeft, Phone, KeyRound, User } from 'lucide-react-native';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { getColors, spacing, fontSizes, radius, shadows } from '../utils/theme';

export default function AuthScreen({ route, navigation }: any) {
  const { role } = route.params;
  const { setAuth } = useAuthStore();
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors);

  const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const requestOTP = async () => {
    if (!phone) return Alert.alert('Error', 'Enter your phone number');
    setLoading(true);
    try {
      await authAPI.requestOTP(phone);
      setStep('otp');
    } catch (err) {
      Alert.alert('Error', 'Could not send OTP. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
  if (!otp) return Alert.alert('Error', 'Enter the OTP');
  setLoading(true);
  try {
    let res;
    let attempts = 0;
    while (attempts < 3) {
      try {
        res = await authAPI.verifyOTP({
          phone_number: phone,
          otp_code: otp,
        });
        break;
      } catch (err: any) {
        attempts++;
        if (attempts === 3) throw err;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    if (res?.data.needs_profile) {
      setStep('profile');
    } else {
      await setAuth(res!.data.token, res!.data.user);
    }
  } catch (err: any) {
    if (err.code === 'ECONNABORTED') {
      Alert.alert('Slow connection', 'Request timed out. Please try again.');
    } else {
      Alert.alert('Error', err.response?.data?.error || 'Invalid or expired OTP');
    }
  } finally {
    setLoading(false);
  }
};

  const completeProfile = async () => {
    if (!firstName || !lastName) {
      return Alert.alert('Error', 'Enter your first and last name');
    }
    setLoading(true);
    try {
      const res = await authAPI.verifyOTP({
        phone_number: phone,
        otp_code: otp,
        first_name: firstName,
        last_name: lastName,
        email,
        role,
      });
      await setAuth(res.data.token, res.data.user);
    } catch (err: any) {
      if (err.code === 'ECONNABORTED') {
        Alert.alert('Slow connection', 'Request timed out. Please try again.');
      } else {
        Alert.alert('Error', err.response?.data?.error || 'Could not complete registration.');
      }
    } finally {
      setLoading(false);
    }
  };

  const stepConfig = {
    phone: {
      icon: <Phone size={22} color={colors.primary} />,
      title: 'Enter your number',
      subtitle: "We'll send a verification code",
    },
    otp: {
      icon: <KeyRound size={22} color={colors.primary} />,
      title: 'Verify your number',
      subtitle: 'Check your server terminal for the code',
    },
    profile: {
      icon: <User size={22} color={colors.primary} />,
      title: 'Complete your profile',
      subtitle: 'Tell us a bit about yourself',
    },
  };

  const current = stepConfig[step];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => step === 'phone' ? navigation.goBack() : setStep('phone')}
          >
            <ArrowLeft size={22} color={colors.dark} />
          </TouchableOpacity>
          <View style={styles.stepIndicator}>
            {['phone', 'otp', 'profile'].map((s, i) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  s === step && styles.stepDotActive,
                  ['phone', 'otp', 'profile'].indexOf(step) > i && styles.stepDotDone,
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            {current.icon}
          </View>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.subtitle}>{current.subtitle}</Text>

          {step === 'phone' && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.prefix}>+233</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="244 000 001"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    placeholderTextColor={colors.gray3}
                  />
                </View>
              </View>
              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={requestOTP}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading
                  ? <ActivityIndicator color={colors.dark} />
                  : <Text style={styles.btnText}>Send Code</Text>
                }
              </TouchableOpacity>
            </>
          )}

          {step === 'otp' && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Verification Code</Text>
                <TextInput
                  style={[styles.inputWrapper, styles.otpInput]}
                  placeholder="• • • • • •"
                  keyboardType="number-pad"
                  value={otp}
                  onChangeText={setOtp}
                  maxLength={6}
                  placeholderTextColor={colors.gray3}
                />
              </View>
              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={verifyOTP}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading
                  ? <ActivityIndicator color={colors.dark} />
                  : <Text style={styles.btnText}>Verify</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={requestOTP} style={styles.resendBtn}>
                <Text style={styles.resendText}>Resend code</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'profile' && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>First Name</Text>
                <TextInput
                  style={styles.inputWrapper}
                  placeholder="John"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholderTextColor={colors.gray3}
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <TextInput
                  style={styles.inputWrapper}
                  placeholder="Doe"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholderTextColor={colors.gray3}
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email (optional)</Text>
                <TextInput
                  style={styles.inputWrapper}
                  placeholder="john@ug.edu.gh"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  placeholderTextColor={colors.gray3}
                />
              </View>
              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={completeProfile}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading
                  ? <ActivityIndicator color={colors.dark} />
                  : <Text style={styles.btnText}>Get Started</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  keyboardView: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  stepDot: {
    width: 8, height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.gray2,
  },
  stepDotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  stepDotDone: {
    backgroundColor: colors.primaryDark,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  iconContainer: {
    width: 48, height: 48,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,184,0,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.dark,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  inputContainer: { marginBottom: spacing.md },
  inputLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.gray2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSizes.md,
    color: colors.dark,
  },
  prefix: {
    fontSize: fontSizes.md,
    color: colors.dark,
    fontWeight: '600',
    marginRight: spacing.sm,
    paddingRight: spacing.sm,
    borderRightWidth: 1,
    borderRightColor: colors.gray2,
  },
  input: {
    flex: 1,
    fontSize: fontSizes.md,
    color: colors.dark,
  },
  otpInput: {
    fontSize: fontSizes.xl,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '700',
  },
  btn: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
    marginTop: spacing.sm,
    ...shadows.md,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.dark,
    letterSpacing: 0.3,
  },
  resendBtn: {
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  resendText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontWeight: '600',
  },
});