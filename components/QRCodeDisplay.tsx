import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  label?: string;
}

export function QRCodeDisplay({ value, size = 220, label }: QRCodeDisplayProps) {
  return (
    <View style={styles.container}>
      <View style={styles.qrWrapper}>
        <QRCode
          value={value}
          size={size}
          color="#111827"
          backgroundColor="#ffffff"
          ecl="M"
        />
      </View>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.codeLabel}>{label}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16,
  },
  qrWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  labelContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  codeLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 4,
    textAlign: 'center',
  },
});
