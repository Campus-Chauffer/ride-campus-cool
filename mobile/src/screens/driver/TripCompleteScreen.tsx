import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ScrollView, TextInput, Alert, Dimensions
} from 'react-native';
import { Flag, CheckCircle } from 'lucide-react-native';
import { useThemeStore } from '../../store/themeStore';
import { getColors, spacing, fontSizes, radius, shadows, bottomPadding, androidTopPadding } from '../../utils/theme';

const { width } = Dimensions.get('window');

interface Props {
  trip: any;
  onDone: () => void;
  onRate: (rating: number, comment: string) => void;
  onReport: () => void;
}

export default function TripCompleteScreen({ trip, onDone, onRate, onReport }: Props) {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

 const fare = parseFloat(trip.fare) || 0;
  const commission = parseFloat(trip.commission) || 0;
  const earned = (fare - commission).toFixed(2);

  const submitRating = () => {
    if (rating === 0) return Alert.alert('Rate passenger', 'Please select a star rating');
    onRate(rating, comment);
    setSubmitted(true);
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
          <View style={styles.checkCircle}>
            <CheckCircle size={40} color={colors.primary} />
          </View>
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
                  <Text style={[styles.starText, { color: star <= rating ? colors.primary : colors.gray2 }]}>
                    ★
                  </Text>
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
            <TouchableOpacity style={styles.submitBtn} onPress={submitRating}>
              <Text style={styles.submitBtnText}>Submit Rating</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.ratedCard}>
            <CheckCircle size={20} color={colors.success} />
            <Text style={styles.ratedText}>Passenger rated successfully</Text>
          </View>
        )}

        {/* Actions */}
        <TouchableOpacity style={styles.reportBtn} onPress={onReport}>
          <Flag size={14} color={colors.error} />
          <Text style={styles.reportBtnText}>Report this passenger</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.doneBtn} onPress={onDone}>
          <Text style={styles.doneBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
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
    backgroundColor: 'rgba(255,184,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.2)',
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
  earningsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  earningsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  earningsItem: { flex: 1, alignItems: 'center' },
  earningsDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  earningsLabel: {
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 4,
    textAlign: 'center',
  },
  earningsValue: {
    fontSize: fontSizes.md,
    fontWeight: '800',
    color: colors.white,
  },
  ratingCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    alignItems: 'center',
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
  starText: { fontSize: 28 },
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
  submitBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    padding: spacing.sm + 2,
    borderRadius: radius.full,
    alignItems: 'center',
    ...shadows.sm,
  },
  submitBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.dark,
  },
  ratedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(76,175,80,0.1)',
    padding: spacing.md,
    borderRadius: radius.lg,
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
    backgroundColor: 'rgba(255,255,255,0.1)',
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