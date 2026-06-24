import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator,
  Alert, StatusBar, KeyboardAvoidingView, Platform
} from 'react-native';
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { authAPI } from '../services/api';
import { colors, spacing, fontSizes, radius, shadows } from '../utils/theme';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [step, setStep] = useState<'email' | 'otp' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendReset = async () => {
    if (!email) return Alert.alert('Error', 'Enter your email');
    setLoading(true);
    try {
      const res = await authAPI.forgotPassword(email);
      setPhone(res.data.phone_number || '');
      setStep('otp');
      Alert.alert('Code sent', 'Check your email for the reset code');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Could not send reset code');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!otp) return Alert.alert('Error', 'Enter the reset code');
    if (!newPassword) return Alert.alert('Error', 'Enter a new password');
    if (newPassword.length < 6) return Alert.alert('Error', 'Password must be at least 6 characters');
    if (newPassword !== confirmPassword) return Alert.alert('Error', 'Passwords do not match');

    setLoading(true);
    try {
      await authAPI.resetPassword(phone, otp, newPassword);
      Alert.alert('Success', 'Password reset successfully', [
        { text: 'Login', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => step === 'email' ? navigation.goBack() : setStep('email')}
          >
            <ArrowLeft size={22} color={colors.dark} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {step === 'email' && (
            <>
              <Text style={styles.title}>Forgot password?</Text>
              <Text style={styles.subtitle}>Enter your email and we'll send a reset code</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={18} color={colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="your@email.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={colors.gray3}
                  />
                </View>
              </View>
              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={sendReset}
                disabled={loading}
                activeOpacity={0.9}
              >
                {loading
                  ? <ActivityIndicator color={colors.dark} />
                  : <Text style={styles.btnText}>Send Reset Code</Text>
                }
              </TouchableOpacity>
            </>
          )}

          {step === 'otp' && (
            <>
              <Text style={styles.title}>Enter reset code</Text>
              <Text style={styles.subtitle}>Check your email for the 6-digit code</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Reset Code</Text>
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
                onPress={() => {
                  if (!otp) return Alert.alert('Error', 'Enter the reset code');
                  setStep('reset');
                }}
                disabled={loading}
                activeOpacity={0.9}
              >
                <Text style={styles.btnText}>Continue</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'reset' && (
            <>
              <Text style={styles.title}>New password</Text>
              <Text style={styles.subtitle}>Choose a strong password</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>New Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={18} color={colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChangeText={setNewPassword}
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
              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={resetPassword}
                disabled={loading}
                activeOpacity={0.9}
              >
                {loading
                  ? <ActivityIndicator color={colors.dark} />
                  : <Text style={styles.btnText}>Reset Password</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  keyboardView: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
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
  btnText: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.dark,
    letterSpacing: 0.3,
  },
});