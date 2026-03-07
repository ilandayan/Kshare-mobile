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
    sm: { paddingHorizontal: 6, paddingVertical: 2, fontSize: 10, emojiSize: 12 },
    md: { paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, emojiSize: 14 },
    lg: { paddingHorizontal: 12, paddingVertical: 6, fontSize: 14, emojiSize: 18 },
  };

  const s = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: info.bgColor,
          paddingHorizontal: s.paddingHorizontal,
          paddingVertical: s.paddingVertical,
          borderColor: info.color + '40',
        },
      ]}
    >
      <Text style={{ fontSize: s.emojiSize }}>{info.emoji}</Text>
      <Text
        style={[
          styles.label,
          { color: info.color, fontSize: s.fontSize },
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
    gap: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '600',
  },
});
