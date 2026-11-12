import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ScrollView, TextInput, Alert, Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Flag, CheckCircle, Star, Info } from 'lucide-react-native';
import { useThemeStore } from '../../store/themeStore';
import { getColors, spacing, fontSizes, radius, bottomPadding, androidTopPadding, navy, white, mutedOnDark, gradients, tintedShadow } from '../../utils/theme';

interface Props {
  trip: any;
  onDone: () => void;
  onRate: (rating: number, comment: string) => void;
  onReport: (description: string) => void;
}

export default function TripCompleteScreen({ trip, onDone, onRate, onReport }: Props) {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors, isDark);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

 const fare = parseFloat(trip.fare) || 0;
  const commission = parseFloat(trip.commission) || 0;
  // An ordinary discount eats into the platform's own commission first —
  // free for the company — so most of the time there's nothing extra owed
  // to the driver at all. Only the leftover that would otherwise cut into
  // the driver's own earnings (a free ride, or a flat discount bigger than
  // commission on this fare) gets reimbursed in cash — that real figure
  // comes from the backend (driver_reimbursement), not from
  // original_fare - fare, which is the passenger's discount and is often
  // larger than what's actually owed to the driver.
  const reimbursement = parseFloat(trip.driver_reimbursement) || 0;
  const isDiscounted = reimbursement > 0;
  const earned = (fare - commission + reimbursement).toFixed(2);

  const submitRating = () => {
    if (rating === 0) return Alert.alert('Rate passenger', 'Please select a star rating');
    onRate(rating, comment);
    setSubmitted(true);
  };

  const submitReport = async () => {
    if (!reportText.trim()) return Alert.alert('Required', 'Please describe the issue');
    setReportSubmitting(true);
    try {
      await onReport(reportText.trim());
      setReportModal(false);
      setReportText('');
      Alert.alert('Report submitted', 'Thank you. Our team will review your report.');
    } catch (err) {
      Alert.alert('Error', 'Could not submit report. Please try again.');
    } finally {
      setReportSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'dark-content' : 'light-content'} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={gradients.primaryCta}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.checkCircle}
          >
            <CheckCircle size={36} color={navy} />
          </LinearGradient>
          <Text style={styles.title}>Trip Complete!</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {trip.pickup_address} → {trip.dropoff_address}
          </Text>
        </View>

        {/* Earnings */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsRow}>
            <View style={styles.earningsItem}>
              <Text style={styles.earningsLabel}>Fare</Text>
              <Text style={styles.earningsValue}>GH₵{fare.toFixed(2)}</Text>
            </View>
            <View style={styles.earningsDivider} />
            <View style={styles.earningsItem}>
              <Text style={styles.earningsLabel}>Commission</Text>
              <Text style={[styles.earningsValue, { color: colors.error }]}>
                -GH₵{commission.toFixed(2)}
              </Text>
            </View>
            <View style={styles.earningsDivider} />
            <View style={styles.earningsItem}>
              <Text style={styles.earningsLabel}>You Earn</Text>
              <Text style={[styles.earningsValue, { color: colors.success }]}>
                GH₵{earned}
              </Text>
            </View>
          </View>
        </View>

        {isDiscounted && (
          <View style={styles.discountBanner}>
            <Info size={16} color={colors.info} />
            <Text style={styles.discountBannerText}>
              {fare === 0
                ? `This was a free ride — don't collect anything from your passenger. Campus Chauffeur owes you GH₵${reimbursement.toFixed(2)} for this trip. Contact support after your shift to receive it.`
                : `This ride was discounted — collect GH₵${fare.toFixed(2)} in cash from your passenger. Campus Chauffeur owes you an extra GH₵${reimbursement.toFixed(2)}. Contact support after your shift to receive it.`
              }
            </Text>
          </View>
        )}

        {/* Rating */}
        {!submitted ? (
          <View style={styles.ratingCard}>
            <Text style={styles.ratingTitle}>Rate your passenger</Text>
            <Text style={styles.ratingSubtitle}>
              {trip.passenger_first_name} {trip.passenger_last_name}
            </Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                  <Star
                    size={28}
                    color={star <= rating ? colors.primary : colors.gray2}
                    fill={star <= rating ? colors.primary : 'transparent'}
                    strokeWidth={1.5}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment (optional)"
              placeholderTextColor={colors.gray3}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={2}
            />
            <TouchableOpacity style={styles.submitBtnShadowWrap} onPress={submitRating} activeOpacity={0.88}>
              <LinearGradient
                colors={gradients.primaryCta}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitBtn}
              >
                <Text style={styles.submitBtnText}>Submit Rating</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.ratedCard}>
            <CheckCircle size={20} color={colors.success} />
            <Text style={styles.ratedText}>Passenger rated successfully</Text>
          </View>
        )}

        {/* Actions */}
        <TouchableOpacity style={styles.reportBtn} onPress={() => setReportModal(true)}>
          <Flag size={14} color={colors.error} />
          <Text style={styles.reportBtnText}>Report this passenger</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.doneBtn} onPress={onDone}>
          <Text style={styles.doneBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Report modal */}
      <Modal visible={reportModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Report Passenger</Text>
            <Text style={styles.modalSubtitle}>
              Describe what happened. Our team will review within 24 hours.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Describe the issue..."
              placeholderTextColor={colors.gray3}
              value={reportText}
              onChangeText={setReportText}
              multiline
              numberOfLines={4}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setReportModal(false); setReportText(''); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, reportSubmitting && styles.submitBtnDisabled]}
                onPress={submitReport}
                disabled={reportSubmitting}
              >
                <Text style={styles.modalSubmitText}>
                  {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark, paddingTop: androidTopPadding },
  scroll: { padding: spacing.md, paddingBottom: bottomPadding, flexGrow: 1, justifyContent: 'center' },
  header: {
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingTop: 0,
  },
  checkCircle: {
    width: 60, height: 60,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
    ...tintedShadow(colors.primaryDark, isDark ? 0 : 0.3),
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.xs,
    color: mutedOnDark(isDark, 0.4),
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
  earningsCard: {
    backgroundColor: mutedOnDark(isDark, 0.05),
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  earningsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  earningsItem: { flex: 1, alignItems: 'center' },
  earningsDivider: { width: 1, backgroundColor: mutedOnDark(isDark, 0.1) },
  earningsLabel: {
    fontSize: fontSizes.xs,
    color: mutedOnDark(isDark, 0.4),
    marginBottom: 4,
    textAlign: 'center',
  },
  earningsValue: {
    fontSize: fontSizes.md,
    fontWeight: '800',
    color: colors.white,
  },
  discountBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: 'rgba(33,150,243,0.1)',
    padding: spacing.md,
    borderRadius: radius.xl,
    marginBottom: spacing.sm,
  },
  discountBannerText: {
    flex: 1,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.info,
    lineHeight: 18,
  },
  ratingCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
    ...tintedShadow(navy, isDark ? 0 : 0.2),
  },
  ratingTitle: {
    fontSize: fontSizes.md,
    fontWeight: '800',
    color: colors.dark,
    marginBottom: 2,
  },
  ratingSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  commentInput: {
    width: '100%',
    backgroundColor: colors.gray,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.gray2,
    padding: spacing.sm,
    fontSize: fontSizes.sm,
    color: colors.dark,
    marginBottom: spacing.sm,
    textAlignVertical: 'top',
    minHeight: 60,
  },
  submitBtnShadowWrap: { width: '100%', borderRadius: radius.full, ...tintedShadow(colors.primaryDark, isDark ? 0 : 0.3) },
  submitBtn: {
    width: '100%',
    padding: spacing.sm + 2,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  // submitBtn's background is the fixed brand yellow in both themes, so its
  // text is pinned to navy rather than colors.dark, which would invert to
  // near-white in dark mode and disappear against the still-yellow button.
  submitBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: navy,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.white, borderTopLeftRadius: radius.xl + 8, borderTopRightRadius: radius.xl + 8, padding: spacing.lg, paddingBottom: spacing.xxl, ...tintedShadow(navy, isDark ? 0 : 0.25) },
  modalTitle: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.dark, marginBottom: spacing.xs },
  modalSubtitle: { fontSize: fontSizes.sm, color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 20 },
  modalInput: { backgroundColor: colors.gray, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.gray2, padding: spacing.md, fontSize: fontSizes.sm, color: colors.dark, minHeight: 100, textAlignVertical: 'top', marginBottom: spacing.lg },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
  modalCancelBtn: { flex: 1, padding: spacing.md, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.gray2, alignItems: 'center' },
  modalCancelText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.textMuted },
  modalSubmitBtn: { flex: 1, padding: spacing.md, borderRadius: radius.full, backgroundColor: colors.error, alignItems: 'center' },
  // modalSubmitBtn's background is the fixed error red in both themes, so
  // its text is pinned to white rather than colors.white, which would
  // invert to navy in dark mode.
  modalSubmitText: { fontSize: fontSizes.sm, fontWeight: '700', color: white },
  ratedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(76,175,80,0.1)',
    padding: spacing.md,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    justifyContent: 'center',
  },
  ratedText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.success,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  reportBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.error,
  },
  doneBtn: {
    backgroundColor: mutedOnDark(isDark, 0.1),
    padding: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.white,
  },
});