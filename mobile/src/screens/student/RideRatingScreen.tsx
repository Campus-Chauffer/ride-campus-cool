import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, TextInput, StatusBar, ScrollView, Modal
} from 'react-native';
import { Star, Flag } from 'lucide-react-native';
import { useRideStore } from '../../store/rideStore';
import { useThemeStore } from '../../store/themeStore';
import { getColors, spacing, fontSizes, radius, shadows } from '../../utils/theme';
import api from '../../services/api';

export default function RideRatingScreen({ route, navigation }: any) {
  const { trip } = route.params;
  const { clearRide } = useRideStore();
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const TAGS = ['Great driver', 'On time', 'Smooth ride', 'Friendly', 'Safe driving'];
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const goHome = () => {
    clearRide();
    navigation.replace('StudentHome');
  };

  const submit = async () => {
    if (rating === 0) return Alert.alert('Rate your driver', 'Please select a star rating');
    setLoading(true);
    try {
      const fullComment = selectedTags.length > 0
        ? `${selectedTags.join(', ')}${comment ? '. ' + comment : ''}`
        : comment;
      await api.post(`/ratings/${trip.id}/rate-driver`, { rating, comment: fullComment });
      goHome();
    } catch (err) {
      goHome();
    } finally {
      setLoading(false);
    }
  };

  const submitReport = async () => {
    if (!reportText.trim()) return Alert.alert('Required', 'Please describe the issue');
    setReportSubmitting(true);
    try {
      await api.post('/reports', {
        reported_id: trip.driver_user_id || trip.driver_id,
        trip_id: trip.id,
        type: 'driver',
        description: reportText.trim(),
      });
      setReportModal(false);
      Alert.alert('Report submitted', 'Thank you. Our team will review your report.', [
        { text: 'OK', onPress: goHome }
      ]);
    } catch (err) {
      Alert.alert('Error', 'Could not submit report. Please try again.');
    } finally {
      setReportSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.completeBadge}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkText}>✓</Text>
          </View>
          <Text style={styles.completeTitle}>Trip Complete</Text>
          <Text style={styles.completeSubtitle}>You've arrived at your destination</Text>
        </View>

        <View style={styles.fareCard}>
          <View style={styles.fareRow}>
            <View>
              <Text style={styles.fareLabel}>Total fare</Text>
              <Text style={styles.fareValue}>GH₵{Math.round(parseFloat(trip.fare))}</Text>
            </View>
            <View style={styles.fareDivider} />
            <View>
              <Text style={styles.fareLabel}>Route</Text>
              <Text style={styles.fareRoute} numberOfLines={1}>{trip.dropoff_address}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Rate your driver</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
              <Star
                size={44}
                color={rating >= star ? colors.primary : colors.gray2}
                fill={rating >= star ? colors.primary : 'transparent'}
                strokeWidth={1.5}
              />
            </TouchableOpacity>
          ))}
        </View>

        {rating > 0 && (
          <Text style={styles.ratingText}>
            {rating === 5 ? 'Excellent!' : rating === 4 ? 'Good' : rating === 3 ? 'Average' : rating === 2 ? 'Poor' : 'Very Poor'}
          </Text>
        )}

        <Text style={styles.sectionTitle}>What went well?</Text>
        <View style={styles.tagsRow}>
          {TAGS.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[styles.tag, selectedTags.includes(tag) && styles.tagActive]}
              onPress={() => toggleTag(tag)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextActive]}>
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Additional comments</Text>
        <TextInput
          style={styles.commentInput}
          placeholder="Tell us more about your experience..."
          placeholderTextColor={colors.gray3}
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={submit}
          disabled={loading}
          activeOpacity={0.9}
        >
          <Text style={styles.submitBtnText}>Submit Rating</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={goHome} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        {/* Report button */}
        <TouchableOpacity style={styles.reportBtn} onPress={() => setReportModal(true)}>
          <Flag size={14} color={colors.error} />
          <Text style={styles.reportBtnText}>Report this driver</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Report modal */}
      <Modal visible={reportModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Report Driver</Text>
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

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  completeBadge: { alignItems: 'center', marginBottom: spacing.lg, paddingTop: spacing.md },
  checkCircle: {
    width: 72, height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.md,
  },
  checkText: { fontSize: 32, color: colors.white },
  completeTitle: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.dark, marginBottom: spacing.xs },
  completeSubtitle: { fontSize: fontSizes.sm, color: colors.textMuted },
  fareCard: { backgroundColor: colors.dark, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, ...shadows.md },
  fareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  fareLabel: { fontSize: fontSizes.xs, color: 'rgba(255,255,255,0.5)', fontWeight: '500', marginBottom: spacing.xs, textAlign: 'center' },
  fareValue: { fontSize: fontSizes.xxl, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  fareDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)' },
  fareRoute: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.white, textAlign: 'center', maxWidth: 140 },
  sectionTitle: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.dark, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  // Sits directly on the white screen background, not the dark fare card —
  // brand yellow text there is ~1.7:1 contrast, so use navy instead.
  ratingText: { textAlign: 'center', fontSize: fontSizes.md, fontWeight: '700', color: colors.dark, marginBottom: spacing.lg },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  tag: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.gray2, backgroundColor: colors.gray },
  tagActive: { borderColor: colors.primary, backgroundColor: '#FFFBF0' },
  tagText: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.textMuted },
  tagTextActive: { color: colors.dark },
  commentInput: { backgroundColor: colors.gray, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.gray2, padding: spacing.md, fontSize: fontSizes.sm, color: colors.dark, marginBottom: spacing.lg, minHeight: 80, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.full, alignItems: 'center', ...shadows.md },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: fontSizes.md, fontWeight: '700', color: colors.dark, letterSpacing: 0.3 },
  skipBtn: { alignItems: 'center', padding: spacing.md, marginTop: spacing.sm },
  skipText: { fontSize: fontSizes.sm, color: colors.textMuted, fontWeight: '600' },
  reportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md, marginTop: spacing.xs },
  reportBtnText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.error },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: spacing.xxl },
  modalTitle: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.dark, marginBottom: spacing.xs },
  modalSubtitle: { fontSize: fontSizes.sm, color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 20 },
  modalInput: { backgroundColor: colors.gray, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.gray2, padding: spacing.md, fontSize: fontSizes.sm, color: colors.dark, minHeight: 100, textAlignVertical: 'top', marginBottom: spacing.lg },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
  modalCancelBtn: { flex: 1, padding: spacing.md, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.gray2, alignItems: 'center' },
  modalCancelText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.textMuted },
  modalSubmitBtn: { flex: 1, padding: spacing.md, borderRadius: radius.full, backgroundColor: colors.error, alignItems: 'center' },
  modalSubmitText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.white },
});