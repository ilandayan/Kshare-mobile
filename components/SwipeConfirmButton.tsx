import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SwipeConfirmButtonProps {
  onConfirm: () => Promise<void>;
  label?: string;
  disabled?: boolean;
}

const KNOB_SIZE = 56;
const THRESHOLD = 0.85;

export function SwipeConfirmButton({
  onConfirm,
  label = 'Glissez pour confirmer le retrait',
  disabled = false,
}: SwipeConfirmButtonProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const trackWidth = useRef(0);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const maxSlide = useCallback(
    () => Math.max(0, trackWidth.current - KNOB_SIZE - 8),
    [],
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled && !confirming && !confirmed,
      onMoveShouldSetPanResponder: (_, gs) =>
        !disabled && !confirming && !confirmed && Math.abs(gs.dx) > 5,
      onPanResponderMove: (_, gs) => {
        const max = maxSlide();
        if (max <= 0) return;
        const x = Math.max(0, Math.min(gs.dx, max));
        translateX.setValue(x);
      },
      onPanResponderRelease: async (_, gs) => {
        const max = maxSlide();
        if (max <= 0) return;
        const ratio = gs.dx / max;

        if (ratio >= THRESHOLD) {
          // Snap to end
          Animated.spring(translateX, {
            toValue: max,
            useNativeDriver: true,
            bounciness: 0,
            speed: 20,
          }).start();

          setConfirming(true);
          try {
            await onConfirm();
            setConfirmed(true);
          } catch {
            // Reset on error
            setConfirming(false);
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 6,
            }).start();
          }
        } else {
          // Spring back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        }
      },
    }),
  ).current;

  const progressColor = translateX.interpolate({
    inputRange: [0, maxSlide() || 1],
    outputRange: ['#3744C8', '#22C55E'],
    extrapolate: 'clamp',
  });

  if (confirmed) {
    return (
      <View style={[styles.track, styles.trackConfirmed]}>
        <Ionicons name="checkmark-circle" size={24} color="#fff" />
        <Text style={styles.confirmedText}>Retrait confirm&eacute; !</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.track, disabled && styles.trackDisabled]}
      onLayout={(e) => {
        trackWidth.current = e.nativeEvent.layout.width;
      }}
    >
      {/* Progress fill */}
      <Animated.View
        style={[
          styles.progressFill,
          {
            backgroundColor: progressColor,
            transform: [{ scaleX: translateX.interpolate({
              inputRange: [0, maxSlide() || 1],
              outputRange: [0, 1],
              extrapolate: 'clamp',
            }) }],
          },
        ]}
      />

      {/* Label */}
      <Animated.Text
        style={[
          styles.label,
          {
            opacity: translateX.interpolate({
              inputRange: [0, (maxSlide() || 1) * 0.5],
              outputRange: [1, 0],
              extrapolate: 'clamp',
            }),
          },
        ]}
      >
        {label}
      </Animated.Text>

      {/* Knob */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.knob,
          { transform: [{ translateX }] },
        ]}
      >
        {confirming ? (
          <ActivityIndicator color="#3744C8" size="small" />
        ) : (
          <Ionicons name="chevron-forward" size={22} color="#3744C8" />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: KNOB_SIZE + 8,
    borderRadius: (KNOB_SIZE + 8) / 2,
    backgroundColor: '#3744C8',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  trackDisabled: {
    opacity: 0.4,
  },
  trackConfirmed: {
    backgroundColor: '#22C55E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  progressFill: {
    ...StyleSheet.absoluteFillObject,
    transformOrigin: 'left',
  },
  label: {
    position: 'absolute',
    alignSelf: 'center',
    left: KNOB_SIZE + 16,
    right: 16,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  knob: {
    position: 'absolute',
    left: 4,
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  confirmedText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
});
