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
import { getCommerceImage } from '@/lib/commerceImages';

const BADGE_CONFIG: Record<string, { bg: string; text: string }> = {
  bassari: { bg: '#D94452', text: '#fff' },
  halavi:  { bg: '#2E8BBE', text: '#fff' },
  parve:   { bg: '#2A9D6E', text: '#fff' },
  shabbat: { bg: '#D97B1A', text: '#fff' },
  mix:     { bg: '#7B5CC0', text: '#fff' },
};

function formatTime(value: string): string {
  if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
  const d = new Date(value);
  if (isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatPickupRange(start: string, end: string): string {
  return `${formatTime(start)} - ${formatTime(end)}`;
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
  const typeInfo = BASKET_TYPE_LABELS[basket.type];
  const badge = BADGE_CONFIG[basket.type] ?? { bg: '#6B7280', text: '#fff' };
  const commerce = basket.commerces;
  const commerceId = commerce?.id ?? basket.commerce_id;
  const favorited = isFavorite(commerceId);

  // Computed values
  const remaining = basket.quantity_total - basket.quantity_reserved - basket.quantity_sold;
  const savingsPct = Math.round((1 - basket.sold_price / basket.original_price) * 100);
  const isLowStock = remaining > 0 && remaining <= 2;

  const coverImage = getCommerceImage(commerce?.photos, commerce?.commerce_type);

  const handlePress = () => router.push(`/panier/${basket.id}`);
  const handleFavorite = () => toggleFavorite(commerceId);

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.92}>
      {/* ── Image ── */}
      <View style={styles.imageWrap}>
        {coverImage ? (
          <Image
            source={coverImage}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: typeInfo.bgColor }]} />
        )}

        {/* Category badge — top left */}
        <View style={[styles.categoryBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.categoryBadgeText, { color: badge.text }]}>
            {typeInfo.label}
          </Text>
        </View>

        {/* Savings badge — bottom left */}
        {savingsPct > 0 && (
          <View style={[styles.savingsBadge, { backgroundColor: badge.bg }]}>
            <Text style={styles.savingsBadgeText}>-{savingsPct}%</Text>
          </View>
        )}

        {/* Heart — top right */}
        <TouchableOpacity
          style={styles.heartBtn}
          onPress={handleFavorite}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons
            name={favorited ? 'heart' : 'heart-outline'}
            size={18}
            color={favorited ? '#EF4444' : '#6B7280'}
          />
        </TouchableOpacity>

        {/* Commerce logo — bottom right */}
        <View style={styles.commerceLogoWrap}>
          {commerce?.logo_url ? (
            <Image
              source={{ uri: commerce.logo_url }}
              style={styles.commerceLogoImg}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.commerceLogoPlaceholder}>
              <Text style={styles.commerceLogoInitial}>
                {(commerce?.name ?? 'C').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
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

        {/* Divider */}
        <View style={styles.divider} />

        {/* Price + Réserver */}
        <View style={styles.priceRow}>
          <View style={styles.priceGroup}>
            <Text style={styles.originalPrice}>{basket.original_price.toFixed(2)}€</Text>
            <Text style={styles.soldPrice}>{basket.sold_price.toFixed(2)}€</Text>
          </View>

          <View style={styles.rightGroup}>
            {/* Stock indicator */}
            {isLowStock && (
              <View style={styles.lowStockBadge}>
                <Ionicons name="flame" size={10} color="#F97316" />
                <Text style={styles.lowStockText}>{remaining} restant{remaining > 1 ? 's' : ''}</Text>
              </View>
            )}
            {remaining > 2 && (
              <Text style={styles.stockText}>{remaining} dispo.</Text>
            )}
            {showReserveButton && (
              <TouchableOpacity style={styles.reserveBtn} onPress={handlePress}>
                <Text style={styles.reserveBtnText}>Réserver</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#1e293b',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.09,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  imageWrap: {
    height: 190,
    position: 'relative',
    overflow: 'hidden',
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
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  savingsBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#3744C8',
  },
  savingsBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  heartBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  commerceLogoWrap: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    borderColor: '#fff',
    overflow: 'hidden',
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
  commerceLogoImg: {
    width: '100%',
    height: '100%',
  },
  commerceLogoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#3744C8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commerceLogoInitial: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  body: {
    padding: 16,
    gap: 5,
  },
  commerceName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
  },
  commerceType: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '400',
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
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  originalPrice: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  soldPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3744C8',
    letterSpacing: -0.5,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lowStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF7ED',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  lowStockText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F97316',
  },
  stockText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
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
