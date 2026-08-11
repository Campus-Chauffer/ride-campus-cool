import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator,
  Alert, StatusBar, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { ArrowLeft, Phone, Lock, Eye, EyeOff, Mail } from 'lucide-react-native';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { getColors, spacing, fontSizes, radius, shadows, navy } from '../utils/theme';

export default function RegisterScreen({ route, navigation }: any) {
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
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
      const res = await authAPI.verifyOTP(phone, otp);
      if (res.data.verified) {
        setStep('profile');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
  if (submitted) return;
  if (!firstName || !lastName) return Alert.alert('Error', 'Enter your full name');
  if (!email) return Alert.alert('Error', 'Enter your email');
  if (!password) return Alert.alert('Error', 'Enter a password');
  if (password.length < 6) return Alert.alert('Error', 'Password must be at least 6 characters');
  if (password !== confirmPassword) return Alert.alert('Error', 'Passwords do not match');

  setSubmitted(true);
  setLoading(true);
  try {
    let accountAlreadyExisted = false;
    // Try to register
    try {
      await authAPI.register({
        phone_number: phone,
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        role,
      });
    } catch (regErr: any) {
      // If not "already exists", rethrow
      if (regErr.response?.data?.error !== 'Account already exists') {
        throw regErr;
      }
      accountAlreadyExisted = true;
    }

    // Always login after register attempt — this recovers gracefully from
    // a network hiccup right after a successful registration (response
    // lost, but the account was created). But if "already exists" fired
    // because this phone number already has an account under a *different*
    // role than the one just selected, logging in here would silently drop
    // the user into that other role's home screen with zero indication
    // anything was wrong — which is the exact "signed up as driver, ended
    // up a student" bug. Only auto-login silently when the role matches;
    // otherwise surface it as a real conflict.
    const loginRes = await authAPI.login(phone, password);
    if (accountAlreadyExisted && loginRes.data.user.role !== role) {
      setSubmitted(false);
      Alert.alert(
        'Account already exists',
        `This phone number is already registered as a ${loginRes.data.user.role === 'driver' ? 'driver' : 'student'} account. Please sign in instead, or use a different phone number to register as a ${role === 'driver' ? 'driver' : 'student'}.`
      );
      return;
    }
    await setAuth(loginRes.data.token, loginRes.data.user);

  } catch (err: any) {
    setSubmitted(false);
    if (err.code === 'ECONNABORTED') {
      Alert.alert('Slow connection', 'Please try again');
    } else {
      Alert.alert('Error', err.response?.data?.error || 'Could not create account');
    }
  } finally {
    setLoading(false);
  }
};

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

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {step === 'phone' && (
            <>
              <Text style={styles.title}>Create account</Text>
              <Text style={styles.subtitle}>First, verify your phone number</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={styles.inputWrapper}>
                  <Phone size={18} color={colors.textMuted} />
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
                activeOpacity={0.9}
              >
                {loading
                  ? <ActivityIndicator color={navy} />
                  : <Text style={styles.btnText}>Send Verification Code</Text>
                }
              </TouchableOpacity>
            </>
          )}

          {step === 'otp' && (
            <>
              <Text style={styles.title}>Verify your number</Text>
              <Text style={styles.subtitle}>Enter the code sent to {phone}</Text>
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
                activeOpacity={0.9}
              >
                {loading
                  ? <ActivityIndicator color={navy} />
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
              <Text style={styles.title}>Complete your profile</Text>
              <Text style={styles.subtitle}>Almost there! Set up your account</Text>

              <View style={styles.row}>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>First Name</Text>
                  <TextInput
                    style={styles.inputWrapperSimple}
                    placeholder="John"
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholderTextColor={colors.gray3}
                  />
                </View>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <TextInput
                    style={styles.inputWrapperSimple}
                    placeholder="Doe"
                    value={lastName}
                    onChangeText={setLastName}
                    placeholderTextColor={colors.gray3}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={18} color={colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="john@ug.edu.gh"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={colors.gray3}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={18} color={colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Min 6 characters"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholderTextColor={colors.gray3}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword
                      ? <EyeOff size={18} color={colors.textMuted} />
                      : <Eye size={18} color={colors.textMuted} />
                    }
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={18} color={colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    placeholderTextColor={colors.gray3}
                  />
                </View>
              </View>

              <Text style={styles.consentText}>
                By tapping "Create Account", you agree to our{' '}
                <Text style={styles.consentLink} onPress={() => navigation.navigate('Legal', { type: 'terms' })}>
                  Terms of Service
                </Text>
                {' '}and{' '}
                <Text style={styles.consentLink} onPress={() => navigation.navigate('Legal', { type: 'privacy' })}>
                  Privacy Policy
                </Text>
                .
              </Text>

              <TouchableOpacity
                style={[styles.btn, (loading || submitted) && styles.btnDisabled]}
                onPress={register}
                disabled={loading || submitted}
                activeOpacity={0.9}
              >
                {loading
                  ? <ActivityIndicator color={navy} />
                  : <Text style={styles.btnText}>Create Account</Text>
                }
              </TouchableOpacity>
            </>
          )}

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    color: colors.dark,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
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
    gap: spacing.sm,
    backgroundColor: colors.gray,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.gray2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  inputWrapperSimple: {
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
    backgroundColor: colors.gray,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.gray2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
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
  consentText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  consentLink: {
    color: colors.dark,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  // btn's background is the fixed brand yellow in both themes, so its text
  // is pinned to navy rather than colors.dark, which would invert to
  // near-white in dark mode and disappear against the still-yellow button.
  btnText: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: navy,
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
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  loginText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  loginLink: {
    fontSize: fontSizes.sm,
    // Brand yellow on white is ~1.7:1 contrast — use navy, the other brand color.
    color: colors.dark,
    fontWeight: '700',
  },
});