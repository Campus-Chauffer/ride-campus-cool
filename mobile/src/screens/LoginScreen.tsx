import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator,
  Alert, StatusBar, KeyboardAvoidingView, Platform, Image
} from 'react-native';
import { ArrowLeft, Phone, Lock, Eye, EyeOff } from 'lucide-react-native';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { colors, spacing, fontSizes, radius, shadows } from '../utils/theme';

export default function LoginScreen({ route, navigation }: any) {
  const role = route.params?.role || 'passenger';
  const { setAuth } = useAuthStore();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!identifier || !password) {
      return Alert.alert('Error', 'Enter your phone/email and password');
    }
    setLoading(true);
    try {
      const res = await authAPI.login(identifier, password);
      await setAuth(res.data.token, res.data.user);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Could not login');
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
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={colors.dark} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/cc-logo.jpg')}
              style={{ width: 70, height: 70, borderRadius: 16 }}
            />
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Phone or Email</Text>
            <View style={styles.inputWrapper}>
              <Phone size={18} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="0244000001 or email@ug.edu.gh"
                value={identifier}
                onChangeText={setIdentifier}
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
                placeholder="Your password"
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

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={login}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading
              ? <ActivityIndicator color={colors.dark} />
              : <Text style={styles.btnText}>Sign In</Text>
            }
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register', { role })}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoText: { fontSize: 48 },
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
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
  },
  forgotText: {
    fontSize: fontSizes.sm,
    // Brand yellow reads as ~1.7:1 contrast on white — unreadable as text.
    // Use the other brand color (navy) instead; yellow stays for fills/icons.
    color: colors.dark,
    fontWeight: '600',
  },
  btn: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
    ...shadows.md,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.dark,
    letterSpacing: 0.3,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  registerText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  registerLink: {
    fontSize: fontSizes.sm,
    color: colors.dark,
    fontWeight: '700',
  },
});