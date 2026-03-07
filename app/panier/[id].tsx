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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { BasketTypeBadge } from '@/components/BasketTypeBadge';
import { BASKET_TYPE_LABELS, type Basket } from '@/lib/types';

async function fetchBasket(id: string): Promise<Basket | null> {
  const { data, error } = await supabase
    .from('baskets')
    .select(
      `
      id, type, day, description,
      original_price, sold_price,
      quantity_total, quantity_reserved, quantity_sold,
      status, is_donation, pickup_start, pickup_end, created_at, commerce_id,
      commerces (id, name, address, city, postal_code, logo_url, hashgakha, latitude, longitude)
    `,
    )
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Basket;
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
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const { data: basket, isLoading } = useQuery({
    queryKey: ['basket', id],
    queryFn: () => fetchBasket(id),
    enabled: !!id,
  });

  const favorited = basket ? isFavorite(basket.id) : false;

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

    setIsCheckingOut(true);

    try {
      // Create payment intent via Supabase Edge Function or API
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        'create-payment-intent',
        {
          body: {
            basket_id: basket.id,
            user_id: user.id,
            amount: Math.round(basket.sold_price * 100), // centimes
          },
        },
      );

      if (paymentError || !paymentData?.clientSecret) {
        throw new Error(paymentError?.message ?? 'Impossible de créer le paiement.');
      }

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Kshare',
        paymentIntentClientSecret: paymentData.clientSecret,
        defaultBillingDetails: {
          email: user.email,
        },
        appearance: {
          colors: {
            primary: '#3b82f6',
          },
        },
      });

      if (initError) {
        throw new Error(initError.message);
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('Paiement annulé', presentError.message);
        }
        return;
      }

      // Payment successful — navigate to order confirmation
      const orderId = paymentData.order_id;
      if (orderId) {
        router.replace(`/commande/${orderId}`);
      } else {
        router.replace('/(tabs)/paniers');
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
        <ActivityIndicator size="large" color="#3b82f6" />
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
          <Text style={styles.heroEmoji}>{typeInfo.emoji}</Text>
          <View style={[styles.discountBadge, { backgroundColor: typeInfo.color }]}>
            <Text style={styles.discountText}>-{discount}%</Text>
          </View>
          <TouchableOpacity
            style={styles.favButton}
            onPress={() => toggleFavorite(basket.id)}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Ionicons
              name={favorited ? 'heart' : 'heart-outline'}
              size={26}
              color={favorited ? '#ef4444' : '#6b7280'}
            />
          </TouchableOpacity>
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
            <BasketTypeBadge type={basket.type} size="lg" />
            {basket.description && (
              <Text style={styles.description}>{basket.description}</Text>
            )}
          </View>

          {/* Prix */}
          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <Text style={styles.soldPrice}>{basket.sold_price.toFixed(2)} €</Text>
              <Text style={styles.originalPrice}>{basket.original_price.toFixed(2)} €</Text>
              <View style={[styles.discountPill, { backgroundColor: typeInfo.color + '20' }]}>
                <Text style={[styles.discountPillText, { color: typeInfo.color }]}>
                  -{discount}% de réduction
                </Text>
              </View>
            </View>
            <Text style={styles.saveText}>
              Vous économisez {(basket.original_price - basket.sold_price).toFixed(2)} €
            </Text>
          </View>

          {/* Horaires retrait */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="calendar-outline" size={18} color="#3b82f6" />
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
                <Ionicons name="time-outline" size={18} color="#3b82f6" />
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
        <TouchableOpacity
          style={[
            styles.reserveButton,
            { backgroundColor: isSoldOut ? '#9ca3af' : typeInfo.color },
            isCheckingOut && styles.buttonDisabled,
          ]}
          onPress={handleReserve}
          disabled={isSoldOut || isCheckingOut}
          activeOpacity={0.85}
        >
          {isCheckingOut ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="bag-outline" size={20} color="#ffffff" />
              <Text style={styles.reserveButtonText}>
                {isSoldOut
                  ? 'Rupture de stock'
                  : `Réserver — ${basket.sold_price.toFixed(2)} €`}
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
  heroEmoji: {
    fontSize: 80,
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
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 24,
    padding: 8,
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
});
