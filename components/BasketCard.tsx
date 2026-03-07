import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BASKET_TYPE_LABELS, type Basket } from '@/lib/types';
import { BasketTypeBadge } from './BasketTypeBadge';
import { useAppStore } from '@/lib/store';

interface BasketCardProps {
  basket: Basket;
  variant?: 'vertical' | 'horizontal';
  distanceKm?: number;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function getDiscountPercent(original: number, sold: number): number {
  return Math.round(((original - sold) / original) * 100);
}

export function BasketCard({ basket, variant = 'vertical', distanceKm }: BasketCardProps) {
  const { toggleFavorite, isFavorite } = useAppStore();
  const typeInfo = BASKET_TYPE_LABELS[basket.type];
  const discount = getDiscountPercent(basket.original_price, basket.sold_price);
  const remaining =
    basket.quantity_total - basket.quantity_reserved - basket.quantity_sold;
  const favorited = isFavorite(basket.id);

  const handlePress = () => {
    router.push(`/panier/${basket.id}`);
  };

  const handleFavoritePress = (e: { stopPropagation: () => void }) => {
    e.stopPropagation?.();
    toggleFavorite(basket.id);
  };

  if (variant === 'horizontal') {
    return (
      <TouchableOpacity
        style={[styles.horizontalCard, { borderLeftColor: typeInfo.color, borderLeftWidth: 4 }]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <View
          style={[
            styles.horizontalEmoji,
            { backgroundColor: typeInfo.bgColor },
          ]}
        >
          <Text style={styles.horizontalEmojiText}>{typeInfo.emoji}</Text>
        </View>
        <View style={styles.horizontalContent}>
          <Text style={styles.commerceName} numberOfLines={1}>
            {basket.commerces?.name ?? 'Commerce'}
          </Text>
          <BasketTypeBadge type={basket.type} size="sm" />
          <View style={styles.priceRow}>
            <Text style={styles.soldPrice}>{basket.sold_price.toFixed(2)} €</Text>
            <Text style={styles.originalPrice}>{basket.original_price.toFixed(2)} €</Text>
          </View>
          <Text style={styles.pickupTime}>
            {formatTime(basket.pickup_start)} – {formatTime(basket.pickup_end)}
          </Text>
        </View>
        <View style={styles.horizontalRight}>
          <View style={[styles.discountBadge, { backgroundColor: typeInfo.color }]}>
            <Text style={styles.discountText}>-{discount}%</Text>
          </View>
          {remaining <= 3 && remaining > 0 && (
            <Text style={styles.stockWarning}>{remaining} restant{remaining > 1 ? 's' : ''}</Text>
          )}
          <TouchableOpacity onPress={handleFavoritePress} style={styles.favButton}>
            <Ionicons
              name={favorited ? 'heart' : 'heart-outline'}
              size={20}
              color={favorited ? '#ef4444' : '#9ca3af'}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <View style={[styles.cardHeader, { backgroundColor: typeInfo.bgColor }]}>
        <Text style={styles.cardEmoji}>{typeInfo.emoji}</Text>
        <View style={[styles.discountBadge, { backgroundColor: typeInfo.color }]}>
          <Text style={styles.discountText}>-{discount}%</Text>
        </View>
        <TouchableOpacity
          onPress={handleFavoritePress}
          style={styles.favButtonCard}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons
            name={favorited ? 'heart' : 'heart-outline'}
            size={20}
            color={favorited ? '#ef4444' : '#6b7280'}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.commerceName} numberOfLines={1}>
          {basket.commerces?.name ?? 'Commerce'}
        </Text>

        {basket.commerces?.city && (
          <Text style={styles.cityText} numberOfLines={1}>
            {basket.commerces.city}
            {distanceKm !== undefined && ` • ${distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}`}
          </Text>
        )}

        <BasketTypeBadge type={basket.type} size="sm" />

        <View style={styles.priceRow}>
          <Text style={styles.soldPrice}>{basket.sold_price.toFixed(2)} €</Text>
          <Text style={styles.originalPrice}>{basket.original_price.toFixed(2)} €</Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.pickupRow}>
            <Ionicons name="time-outline" size={12} color="#6b7280" />
            <Text style={styles.pickupTime}>
              {formatTime(basket.pickup_start)} – {formatTime(basket.pickup_end)}
            </Text>
          </View>
          {remaining <= 5 && (
            <Text
              style={[
                styles.stockBadge,
                { color: remaining <= 2 ? '#ef4444' : '#f59e0b' },
              ]}
            >
              {remaining} restant{remaining > 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Vertical card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    width: 180,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardHeader: {
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardEmoji: {
    fontSize: 44,
  },
  favButtonCard: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    padding: 4,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    padding: 12,
    gap: 6,
  },
  commerceName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  cityText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: -2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  soldPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  originalPrice: {
    fontSize: 12,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  pickupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  pickupTime: {
    fontSize: 11,
    color: '#6b7280',
  },
  stockBadge: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Horizontal card
  horizontalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  horizontalEmoji: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalEmojiText: {
    fontSize: 28,
  },
  horizontalContent: {
    flex: 1,
    gap: 4,
  },
  horizontalRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  stockWarning: {
    fontSize: 10,
    color: '#f59e0b',
    fontWeight: '600',
  },
  favButton: {
    padding: 4,
  },
});
