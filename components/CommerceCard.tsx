import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BASKET_TYPE_LABELS, type Basket } from '@/lib/types';
import { useAppStore } from '@/lib/store';

const BADGE_CONFIG: Record<string, { bg: string; text: string }> = {
  bassari: { bg: '#EF4444', text: '#fff' },
  halavi:  { bg: '#3B82F6', text: '#fff' },
  parve:   { bg: '#10B981', text: '#fff' },
  shabbat: { bg: '#F59E0B', text: '#fff' },
  mix:     { bg: '#8B5CF6', text: '#fff' },
};

function formatPickupRange(start: string, end: string): string {
  const s = new Date(start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const e = new Date(end).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${s} - ${e}`;
}

interface CommerceCardProps {
  basket: Basket;
  distanceKm?: number;
  rating?: number;
  showReserveButton?: boolean;
}

export function CommerceCard({
  basket,
  distanceKm,
  rating,
  showReserveButton = true,
}: CommerceCardProps) {
  const { toggleFavorite, isFavorite } = useAppStore();
  const favorited = isFavorite(basket.id);
  const typeInfo = BASKET_TYPE_LABELS[basket.type];
  const badge = BADGE_CONFIG[basket.type] ?? { bg: '#6B7280', text: '#fff' };
  const commerce = basket.commerces;

  const handlePress = () => router.push(`/panier/${basket.id}`);
  const handleFavorite = () => toggleFavorite(basket.id);

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.92}>
      {/* ── Image ── */}
      <View style={styles.imageWrap}>
        {commerce?.logo_url ? (
          <Image
            source={{ uri: commerce.logo_url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: typeInfo.bgColor }]}>
            <Text style={styles.placeholderEmoji}>{typeInfo.emoji}</Text>
          </View>
        )}

        {/* Category badge — top left */}
        <View style={[styles.categoryBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.categoryBadgeText, { color: badge.text }]}>
            {typeInfo.label}
          </Text>
        </View>

        {/* Heart — top right */}
        <TouchableOpacity
          style={styles.heartBtn}
          onPress={handleFavorite}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons
            name={favorited ? 'heart' : 'heart-outline'}
            size={18}
            color="#EF4444"
          />
        </TouchableOpacity>
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>
        <Text style={styles.commerceName} numberOfLines={1}>
          {commerce?.name ?? 'Commerce'}
        </Text>
        <Text style={styles.commerceType} numberOfLines={1}>
          {commerce?.commerce_type ?? commerce?.hashgakha ?? ''}
        </Text>

        {/* Meta row */}
        <View style={styles.metaRow}>
          {distanceKm !== undefined && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={12} color="#6B7280" />
              <Text style={styles.metaText}>{distanceKm.toFixed(1)} km</Text>
            </View>
          )}
          {rating !== undefined && (
            <View style={styles.metaItem}>
              <Ionicons name="star" size={12} color="#FBBF24" />
              <Text style={styles.metaText}>{rating}</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color="#6B7280" />
            <Text style={styles.metaText}>
              {formatPickupRange(basket.pickup_start, basket.pickup_end)}
            </Text>
          </View>
        </View>

        {/* Price + Réserver */}
        <View style={styles.priceRow}>
          <View style={styles.priceGroup}>
            <Text style={styles.originalPrice}>{basket.original_price.toFixed(2)}€</Text>
            <Text style={styles.soldPrice}>{basket.sold_price.toFixed(2)}€</Text>
          </View>
          {showReserveButton && (
            <TouchableOpacity style={styles.reserveBtn} onPress={handlePress}>
              <Text style={styles.reserveBtnText}>Réserver</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },
  imageWrap: {
    height: 190,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 64,
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heartBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 14,
    gap: 4,
  },
  commerceName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  commerceType: {
    fontSize: 13,
    color: '#6B7280',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  priceGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  originalPrice: {
    fontSize: 13,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  soldPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3B82F6',
  },
  reserveBtn: {
    backgroundColor: '#3744C8',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  reserveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
