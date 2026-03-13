import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { usePayment } from '@/lib/usePayment';
import { BasketTypeBadge } from '@/components/BasketTypeBadge';
import { BASKET_TYPE_LABELS, type Basket } from '@/lib/types';
import { getCommerceImage } from '@/lib/commerceImages';

const COMMERCE_TYPE_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  Boucherie:   'food-steak',
  Boulangerie: 'bread-slice',
  Supermarché: 'cart-outline',
  Traiteur:    'food-variant',
  Épicerie:    'storefront-outline',
  Restaurant:  'silverware-fork-knife',
};

function getCommerceIcon(commerceType: string | null | undefined): keyof typeof MaterialCommunityIcons.glyphMap {
  if (!commerceType) return 'storefront-outline';
  return COMMERCE_TYPE_ICONS[commerceType] ?? 'storefront-outline';
}

async function fetchBasket(id: string): Promise<Basket | null> {
  const { data, error } = await supabase
    .from('baskets')
    .select(
      `
      id, type, day, description,
      original_price, sold_price,
      quantity_total, quantity_reserved, quantity_sold,
      status, is_donation, pickup_start, pickup_end, created_at, commerce_id,
      commerces (id, name, address, city, postal_code, logo_url, photos, hashgakha, commerce_type, latitude, longitude)
    `,
    )
    .eq('id', id)
    .single();

  if (error) return null;
  return data as unknown as Basket;
}

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(isoString: string) {
  const date = new Date(isoString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === tomorrow.toDateString()) return 'Demain';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function getDiscount(original: number, sold: number) {
  return Math.round(((original - sold) / original) * 100);
}

export default function BasketDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, toggleFavorite, isFavorite } = useAppStore();
  const { pay } = usePayment();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const { data: basket, isLoading } = useQuery({
    queryKey: ['basket', id],
    queryFn: () => fetchBasket(id),
    enabled: !!id,
  });

  const commerceId = basket?.commerces?.id ?? basket?.commerce_id ?? '';
  const favorited = commerceId ? isFavorite(commerceId) : false;

  const handleReserve = async () => {
    if (!basket || !user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour réserver.');
      return;
    }

    const remaining =
      basket.quantity_total - basket.quantity_reserved - basket.quantity_sold;

    if (remaining <= 0) {
      Alert.alert('Rupture de stock', 'Ce panier n\'est plus disponible.');
      return;
    }

    if (quantity > remaining) {
      Alert.alert('Stock insuffisant', `Seulement ${remaining} panier${remaining > 1 ? 's' : ''} disponible${remaining > 1 ? 's' : ''}.`);
      setQuantity(remaining);
      return;
    }

    setIsCheckingOut(true);

    try {
      const result = await pay({
        basketId: basket.id,
        userId: user.id,
        userEmail: user.email ?? '',
        amount: Math.round(basket.sold_price * quantity * 100), // centimes
        quantity,
      });

      if (result.success) {
        if (result.orderId) {
          router.replace(`/commande/${result.orderId}`);
        } else {
          router.replace('/(tabs)/paniers');
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue.';
      Alert.alert('Erreur de paiement', message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3744C8" />
      </View>
    );
  }

  if (!basket) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Panier introuvable.</Text>
      </View>
    );
  }

  const typeInfo = BASKET_TYPE_LABELS[basket.type];
  const remaining = basket.quantity_total - basket.quantity_reserved - basket.quantity_sold;
  const discount = getDiscount(basket.original_price, basket.sold_price);
  const isSoldOut = remaining <= 0 || basket.status !== 'published';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero visuel */}
        <View style={[styles.hero, { backgroundColor: typeInfo.bgColor }]}>
          {(() => {
            const heroImage = getCommerceImage(basket.commerces?.photos, basket.commerces?.commerce_type);
            return heroImage ? (
              <Image source={heroImage} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            ) : null;
          })()}
          <View style={[styles.discountBadge, { backgroundColor: typeInfo.color }]}>
            <Text style={styles.discountText}>-{discount}%</Text>
          </View>
          <TouchableOpacity
            style={styles.favButton}
            onPress={() => toggleFavorite(commerceId)}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            accessibilityRole="button"
            accessibilityLabel={favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <View style={styles.favIconCircle}>
              <Ionicons
                name={favorited ? 'heart' : 'heart-outline'}
                size={22}
                color={favorited ? '#ef4444' : '#374151'}
                style={{ marginTop: 1 }}
              />
            </View>
          </TouchableOpacity>
          {/* Commerce logo removed from hero — now inline with badge */}
        </View>

        <View style={styles.content}>
          {/* Commerce info */}
          <View style={styles.commerceSection}>
            <View style={styles.commerceHeader}>
              <View>
                <Text style={styles.commerceName}>
                  {basket.commerces?.name ?? 'Commerce'}
                </Text>
                <Text style={styles.commerceAddress}>
                  {basket.commerces?.address}, {basket.commerces?.city}
                </Text>
              </View>
              <View style={styles.hashgakhaBadge}>
                <Text style={styles.hashgakhaText}>
                  {basket.commerces?.hashgakha ?? 'Casher'}
                </Text>
              </View>
            </View>
          </View>

          {/* Type & description */}
          <View style={styles.detailSection}>
            <View style={styles.badgeLogoRow}>
              <BasketTypeBadge type={basket.type} size="lg" />
              <View style={styles.commerceLogo}>
                {basket.commerces?.logo_url ? (
                  <Image
                    source={{ uri: basket.commerces.logo_url }}
                    style={styles.commerceLogoImg}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.commerceLogoInitialCircle}>
                    <Text style={styles.commerceLogoInitial}>
                      {(basket.commerces?.name ?? 'C').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Description */}
          {basket.description && (
            <Text style={styles.description}>{basket.description.replace(/\.$/, '')}</Text>
          )}

          {/* Prix */}
          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <Text style={styles.soldPrice}>{basket.sold_price.toFixed(2)} €</Text>
              <Text style={styles.originalPrice}>{basket.original_price.toFixed(2)} €</Text>
              <View style={[styles.discountPill, { backgroundColor: typeInfo.color }]}>
                <Text style={styles.discountPillText}>
                  -{discount}% de réduction
                </Text>
              </View>
            </View>
            <Text style={styles.saveText}>
              Vous économisez {((basket.original_price - basket.sold_price) * quantity).toFixed(2)} €
            </Text>
          </View>

          {/* Horaires retrait */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="calendar-outline" size={18} color="#3744C8" />
              </View>
              <View>
                <Text style={styles.infoLabel}>Date de retrait</Text>
                <Text style={styles.infoValue}>
                  {formatDate(basket.pickup_start)}
                </Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="time-outline" size={18} color="#3744C8" />
              </View>
              <View>
                <Text style={styles.infoLabel}>Créneau de retrait</Text>
                <Text style={styles.infoValue}>
                  {formatTime(basket.pickup_start)} – {formatTime(basket.pickup_end)}
                </Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="location-outline" size={18} color="#22c55e" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Adresse</Text>
                <Text style={styles.infoValue}>
                  {basket.commerces?.address}
                  {'\n'}
                  {basket.commerces?.postal_code} {basket.commerces?.city}
                </Text>
              </View>
            </View>
          </View>

          {/* Stock */}
          {remaining > 0 && remaining <= 5 && (
            <View style={styles.stockWarning}>
              <Ionicons name="alert-circle-outline" size={16} color="#f59e0b" />
              <Text style={styles.stockWarningText}>
                Plus que {remaining} panier{remaining > 1 ? 's' : ''} disponible{remaining > 1 ? 's' : ''} !
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* CTA fixe en bas */}
      <View style={styles.bottomCTA}>
        {/* Sélecteur de quantité */}
        {!isSoldOut && (
          <View style={styles.quantityRow}>
            <Text style={styles.quantityLabel}>Quantité</Text>
            <View style={styles.quantityStepper}>
              <TouchableOpacity
                style={[
                  styles.quantityButton,
                  quantity <= 1 && styles.quantityButtonDisabled,
                ]}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Ionicons
                  name="remove"
                  size={20}
                  color={quantity <= 1 ? '#d1d5db' : '#111827'}
                />
              </TouchableOpacity>
              <Text style={styles.quantityValue}>{quantity}</Text>
              <TouchableOpacity
                style={[
                  styles.quantityButton,
                  quantity >= remaining && styles.quantityButtonDisabled,
                ]}
                onPress={() => setQuantity((q) => Math.min(remaining, q + 1))}
                disabled={quantity >= remaining}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Ionicons
                  name="add"
                  size={20}
                  color={quantity >= remaining ? '#d1d5db' : '#111827'}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.quantityTotal}>
              {(basket.sold_price * quantity).toFixed(2)} €
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.reserveButton,
            { backgroundColor: isSoldOut ? '#9ca3af' : typeInfo.color },
            isCheckingOut && styles.buttonDisabled,
          ]}
          onPress={handleReserve}
          disabled={isSoldOut || isCheckingOut}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isSoldOut ? 'Rupture de stock' : `Réserver ${quantity} panier${quantity > 1 ? 's' : ''}`}
          accessibilityState={{ disabled: isSoldOut || isCheckingOut }}
        >
          {isCheckingOut ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="bag-outline" size={20} color="#ffffff" />
              <Text style={styles.reserveButtonText}>
                {isSoldOut
                  ? 'Rupture de stock'
                  : `Réserver${quantity > 1 ? ` (×${quantity})` : ''} — ${(basket.sold_price * quantity).toFixed(2)} €`}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
  },
  hero: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commerceLogo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
      android: { elevation: 3 },
    }),
  },
  commerceLogoImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  commerceLogoInitialCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3744C8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commerceLogoInitial: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  discountBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  discountText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  favButton: {
    position: 'absolute',
    top: 12,
    right: 16,
  },
  favIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  content: {
    padding: 20,
    gap: 20,
  },
  commerceSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
  },
  commerceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  commerceName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  commerceAddress: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  hashgakhaBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#fcd34d',
    flexShrink: 0,
  },
  hashgakhaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
  },
  detailSection: {
    gap: 12,
    marginTop: 16,
  },
  descriptionUnderHero: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  description: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  priceSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  soldPrice: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
  },
  originalPrice: {
    fontSize: 18,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  discountPill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  discountPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  saveText: {
    fontSize: 13,
    color: '#22c55e',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    lineHeight: 20,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginLeft: 66,
  },
  stockWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  stockWarningText: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '600',
  },
  bottomCTA: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  reserveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  reserveButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  quantityLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  quantityStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quantityButtonDisabled: {
    backgroundColor: '#f9fafb',
    shadowOpacity: 0,
    elevation: 0,
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    minWidth: 40,
    textAlign: 'center',
  },
  quantityTotal: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
});
