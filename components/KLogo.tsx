import React from 'react';
import { Image, StyleSheet } from 'react-native';

interface KLogoProps {
  size?: number;
}

/**
 * Official Kshare "k" logo — uses the actual brand asset (Logo K blanc.png)
 * for pixel-perfect fidelity with the official logo.
 */
export function KLogo({ size = 56 }: KLogoProps) {
  return (
    <Image
      source={require('../assets/k-white.png')}
      style={[styles.logo, { width: size, height: size }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    // no tinting — the PNG is already white with 3D effect
  },
});
