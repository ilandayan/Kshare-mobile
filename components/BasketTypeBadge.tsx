import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BASKET_TYPE_LABELS, type BasketType } from '@/lib/types';

interface BasketTypeBadgeProps {
  type: BasketType;
  size?: 'sm' | 'md' | 'lg';
}

export function BasketTypeBadge({ type, size = 'md' }: BasketTypeBadgeProps) {
  const info = BASKET_TYPE_LABELS[type];

  const sizeStyles = {
    sm: { paddingHorizontal: 8, paddingVertical: 4, fontSize: 10 },
    md: { paddingHorizontal: 10, paddingVertical: 5, fontSize: 12 },
    lg: { paddingHorizontal: 16, paddingVertical: 8, fontSize: 15 },
  };

  const s = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: info.color,
          paddingHorizontal: s.paddingHorizontal,
          paddingVertical: s.paddingVertical,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          { fontSize: s.fontSize },
        ]}
      >
        {info.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '700',
    color: '#ffffff',
  },
});
