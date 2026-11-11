import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView,
  Alert, ActivityIndicator, StatusBar, Linking,
} from 'react-native';
import { ArrowLeft, ShieldAlert, Phone, MessageCircle } from 'lucide-react-native';
import { ridesAPI, profileAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { getColors, spacing, fontSizes, radius, navy, white, androidTopPadding, tintedShadow } from '../../utils/theme';

const EMERGENCY_SERVICES_NUMBER = '191';

export default function SafetyScreen({ route, navigation }: any) {
  const { trip } = route.params;
  const { user, setAuth } = useAuthStore();
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors, isDark);

  const [contactName, setContactName] = useState(user?.emergency_contact_name || '');
  const [contactPhone, setContactPhone] = useState(user?.emergency_contact_phone || '');
  const [savingContact, setSavingContact] = useState(false);
  const [sendingAlert, setSendingAlert] = useState(false);

  const hasContact = !!user?.emergency_contact_phone;

  const saveContact = async () => {
    if (!contactName || !contactPhone) {
      return Alert.alert('Required', 'Enter both a name and a phone number for your emergency contact');
    }
    setSavingContact(true);
    try {
      const res = await profileAPI.updateProfile({
        emergency_contact_name: contactName,
        emergency_contact_phone: contactPhone,
      });
      const currentToken = await import('@react-native-async-storage/async-storage')
        .then(m => m.default.getItem('token'));
      await setAuth(currentToken || '', { ...user!, ...res.data });
      Alert.alert('Saved', 'Your emergency contact has been saved.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Could not save emergency contact');
    } finally {
      setSavingContact(false);
    }
  };

  const sendAlert = async () => {
    setSendingAlert(true);
    try {
      await ridesAPI.sendSafetyAlert(trip.id);
      Alert.alert(
        'Alert sent',
        `We've texted ${user?.emergency_contact_name || 'your emergency contact'} with your driver and trip details, and logged this with our safety team.`
      );
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Could not send the alert. Please try calling emergency services directly if you need immediate help.');
    } finally {
      setSendingAlert(false);
    }
  };

  const callEmergencyServices = () => {
    Linking.openURL(`tel:${EMERGENCY_SERVICES_NUMBER}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safety</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.iconBanner}>
          <ShieldAlert size={28} color={colors.error} />
        </View>

        {!hasContact ? (
          <>
            <Text style={styles.sectionTitle}>Add an emergency contact</Text>
            <Text style={styles.sectionSubtitle}>
              Set someone we can alert with your trip details if you ever need help during a ride.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Contact Name</Text>
              <TextInput
                style={styles.input}
                value={contactName}
                onChangeText={setContactName}
                placeholder="e.g. Mum"
                placeholderTextColor={colors.gray3}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Contact Phone</Text>
              <TextInput
                style={styles.input}
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
                placeholder="024XXXXXXX"
                placeholderTextColor={colors.gray3}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, savingContact && styles.btnDisabled]}
              onPress={saveContact}
              disabled={savingContact}
            >
              {savingContact
                ? <ActivityIndicator color={navy} />
                : <Text style={styles.primaryBtnText}>Save Contact</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.contactCard}>
              <Text style={styles.contactLabel}>Your emergency contact</Text>
              <Text style={styles.contactName}>{user?.emergency_contact_name}</Text>
              <Text style={styles.contactPhone}>{user?.emergency_contact_phone}</Text>
            </View>

            <TouchableOpacity
              style={[styles.alertBtn, sendingAlert && styles.btnDisabled]}
              onPress={sendAlert}
              disabled={sendingAlert}
            >
              {sendingAlert
                ? <ActivityIndicator color={white} />
                : (
                  <>
                    <MessageCircle size={18} color={white} />
                    <Text style={styles.alertBtnText}>Alert {user?.emergency_contact_name}</Text>
                  </>
                )
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.emergencyBtn} onPress={callEmergencyServices}>
              <Phone size={18} color={white} />
              <Text style={styles.emergencyBtnText}>Call Emergency Services ({EMERGENCY_SERVICES_NUMBER})</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite, paddingTop: androidTopPadding },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...tintedShadow(navy, isDark ? 0 : 0.08),
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    color: colors.dark,
    letterSpacing: -0.3,
  },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  iconBanner: {
    alignSelf: 'center',
    width: 64, height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.error + '18',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    color: colors.dark,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
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
  input: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSizes.md,
    color: colors.dark,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    ...tintedShadow(colors.primaryDark, isDark ? 0 : 0.35),
  },
  primaryBtnText: { fontSize: fontSizes.md, fontWeight: '700', color: navy },
  btnDisabled: { opacity: 0.6 },
  contactCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...tintedShadow(navy, isDark ? 0 : 0.08),
  },
  contactLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  contactName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.dark },
  contactPhone: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 },
  alertBtn: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.error,
    borderRadius: radius.full,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  alertBtnText: { fontSize: fontSizes.md, fontWeight: '700', color: white },
  emergencyBtn: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: navy,
    borderRadius: radius.full,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyBtnText: { fontSize: fontSizes.md, fontWeight: '700', color: white },
});
