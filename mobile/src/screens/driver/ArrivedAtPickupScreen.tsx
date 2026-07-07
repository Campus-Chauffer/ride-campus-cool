import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Alert, Linking,
} from 'react-native';
import { CheckCircle, MapPin, Phone, Clock, AlertTriangle } from 'lucide-react-native';
import { driverAPI } from '../../services/api';
import { colors, spacing, fontSizes, radius, shadows, bottomPadding, androidTopPadding } from '../../utils/theme';

interface Props {
  trip: any;
  onStartTrip: () => void;
  onCancelled: () => void;
}

export default function ArrivedAtPickupScreen({ trip, onStartTrip, onCancelled }: Props) {
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [currentFare, setCurrentFare] = useState(parseFloat(trip.fare));
  const [waitPenalty, setWaitPenalty] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const timerRef = useRef<any>(null);
  const fareRef = useRef<any>(null);

  const FREE_WAIT = 300; // 5 minutes in seconds

  useEffect(() => {
    // Local timer for display
    timerRef.current = setInterval(() => {
      setWaitSeconds(prev => prev + 1);
    }, 1000);

    // Poll backend for live fare every 10 seconds
    fareRef.current = setInterval(async () => {
      try {
        const res = await driverAPI.getWaitFare(trip.id);
        setCurrentFare(res.data.current_fare);
        setWaitPenalty(res.data.wait_penalty);
        setWaitSeconds(res.data.wait_seconds);
      } catch (err) {
        console.log('Wait fare poll error:', err);
      }
    }, 10000);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(fareRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timeRemaining = Math.max(FREE_WAIT - waitSeconds, 0);
  const isInPenalty = waitSeconds > FREE_WAIT;

  const callPassenger = () => {
    if (trip.passenger_phone) {
      Linking.openURL(`tel:${trip.passenger_phone}`);
    }
  };

  const handleStartTrip = async () => {
    setIsStarting(true);
    try {
      await onStartTrip();
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.arrivedIconContainer}>
          <MapPin size={28} color={colors.primary} />
        </View>
        <Text style={styles.arrivedTitle}>You've Arrived!</Text>
        <Text style={styles.arrivedSubtitle}>{trip.pickup_address}</Text>
      </View>

      {/* Timer */}
      <View style={[styles.timerCard, isInPenalty && styles.timerCardPenalty]}>
        <View style={styles.timerRow}>
          <Clock size={20} color={isInPenalty ? '#FF4444' : colors.primary} />
          <Text style={[styles.timerLabel, isInPenalty && styles.timerLabelPenalty]}>
            {isInPenalty ? 'Wait fee active' : 'Free wait time'}
          </Text>
        </View>

        {!isInPenalty ? (
          <>
            <Text style={styles.timerValue}>{formatTime(timeRemaining)}</Text>
            <Text style={styles.timerSub}>remaining before wait fee starts</Text>
          </>
        ) : (
          <>
            <Text style={[styles.timerValue, styles.timerValuePenalty]}>
              +GH₵{waitPenalty.toFixed(2)}
            </Text>
            <Text style={styles.timerSub}>
              GH₵1 added every 2 minutes • Waited {formatTime(waitSeconds)}
            </Text>
          </>
        )}
      </View>

      {/* Fare */}
      <View style={styles.fareCard}>
        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>Base fare</Text>
          <Text style={styles.fareValue}>GH₵{parseFloat(trip.fare).toFixed(2)}</Text>
        </View>
        {waitPenalty > 0 && (
          <View style={styles.fareRow}>
            <Text style={[styles.fareLabel, { color: '#FF4444' }]}>Wait fee</Text>
            <Text style={[styles.fareValue, { color: '#FF4444' }]}>+GH₵{waitPenalty.toFixed(2)}</Text>
          </View>
        )}
        <View style={[styles.fareRow, styles.fareTotalRow]}>
          <Text style={styles.fareTotalLabel}>Current fare</Text>
          <Text style={styles.fareTotalValue}>GH₵{currentFare.toFixed(2)}</Text>
        </View>
      </View>

      {/* Passenger info */}
      <View style={styles.passengerCard}>
        <View style={styles.passengerRow}>
          <View style={styles.passengerAvatar}>
            <Text style={styles.passengerAvatarText}>
              {trip.passenger_first_name?.[0] || 'P'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.passengerName}>
              {trip.passenger_first_name} {trip.passenger_last_name}
            </Text>
            <Text style={styles.passengerLabel}>Your passenger</Text>
          </View>
          {trip.passenger_phone && (
            <TouchableOpacity style={styles.callBtn} onPress={callPassenger}>
              <Phone size={18} color={colors.dark} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Warning note */}
      <View style={styles.warningRow}>
        <AlertTriangle size={14} color={colors.textMuted} />
        <Text style={styles.warningText}>
          GH₵1 is added every 2 minutes after the 5-minute free wait period
        </Text>
      </View>

      {/* Start trip button */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.startBtn, isStarting && { opacity: 0.6 }]}
          onPress={handleStartTrip}
          disabled={isStarting}
        >
          <CheckCircle size={20} color={colors.dark} />
          <Text style={styles.startBtnText}>
            {isStarting ? 'Starting...' : 'Passenger Onboard — Start Trip'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, paddingTop: androidTopPadding },
  header: {
    backgroundColor: colors.dark,
    padding: spacing.xl,
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  arrivedIconContainer: {
    width: 64, height: 64,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,184,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  arrivedTitle: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.white },
  arrivedSubtitle: { fontSize: fontSizes.sm, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: spacing.xs },
  timerCard: {
    margin: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(255,184,0,0.08)',
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,184,0,0.3)',
  },
  timerCardPenalty: {
    backgroundColor: 'rgba(255,68,68,0.08)',
    borderColor: 'rgba(255,68,68,0.3)',
  },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  timerLabel: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.primary },
  timerLabelPenalty: { color: '#FF4444' },
  timerValue: { fontSize: 48, fontWeight: '800', color: colors.primary, letterSpacing: -1 },
  timerValuePenalty: { color: '#FF4444' },
  timerSub: { fontSize: fontSizes.xs, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs },
  fareCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.gray,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  fareLabel: { fontSize: fontSizes.sm, color: colors.textMuted },
  fareValue: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.dark },
  fareTotalRow: { borderTopWidth: 1, borderTopColor: colors.gray2, marginTop: spacing.xs, paddingTop: spacing.sm },
  fareTotalLabel: { fontSize: fontSizes.md, fontWeight: '700', color: colors.dark },
  fareTotalValue: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.dark },
  passengerCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray2,
  },
  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  passengerAvatar: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  passengerAvatarText: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.dark },
  passengerName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.dark },
  passengerLabel: { fontSize: fontSizes.xs, color: colors.textMuted },
  callBtn: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginHorizontal: spacing.lg, marginBottom: spacing.sm },
  warningText: { flex: 1, fontSize: fontSizes.xs, color: colors.textMuted },
  actionContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, paddingBottom: bottomPadding, backgroundColor: colors.white },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.full, ...shadows.md },
  startBtnText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.dark },
});