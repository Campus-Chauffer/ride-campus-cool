import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  onReset: () => void;
}

// Rendered in place of the entire app when a render error escapes every
// screen's own error handling. Deliberately uses fixed colors instead of the
// theme store — the crash that got us here could be anywhere, including
// inside app state, so this can't assume anything else in the app works.
export default function CrashFallbackScreen({ onReset }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.subtitle}>
        Campus Chauffeur ran into a problem. We've been notified and are looking into it.
      </Text>
      <TouchableOpacity style={styles.button} onPress={onReset}>
        <Text style={styles.buttonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#FFB800',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 100,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
  },
});
