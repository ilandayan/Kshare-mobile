import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { LinearGradient } from 'expo-linear-gradient';
import { BASKET_TYPE_LABELS, type Commerce, type Basket, type BasketType } from '@/lib/types';
import { getCommerceImage } from '@/lib/commerceImages';

interface FavoriteCommerce extends Commerce {
  availableBaskets: Basket[];
}

async function fetchFavoriteCommerces(commerceIds: string[]): Promise<FavoriteCommerce[]> {
  if (commerceIds.length === 0) return [];

  // Fetch commerces
  const { data: commerces, error: cErr } = await supabase
    .from('commerces')
    .select('id, name, address, city, postal_code, logo_url, photos, hashgakha, commerce_type, latitude, longitude')
    .in('id', commerceIds);

  if (cErr) throw cErr;
  if (!commerces || commerces.length === 0) return [];

  // Fetch published baskets with stock for those commerces
  const { data: baskets, error: bErr } = await supabase
    .from('baskets')
    .select(
      `id, type, day, description,
       original_price, sold_price,
       quantity_total, quantity_reserved, quantity_sold,
       status, is_donation, pickup_start, pickup_end, created_at, commerce_id,
       commerces (id, name, address, city, postal_code, logo_url, hashgakha, commerce_type, latitude, longitude)`,
    )
    .in('commerce_id', commerceIds)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (bErr) throw bErr;

  const basketsByCommerce = new Map<string, Basket[]>();
  for (const b of (baskets ?? []) as unknown as Basket[]) {
    const remaining = b.quantity_total - b.quantity_reserved - b.quantity_sold;
    if (remaining > 0) {
      const list = basketsByCommerce.get(b.commerce_id) ?? [];
      list.push(b);
      basketsByCommerce.set(b.commerce_id, list);
    }
  }

  return (commerces as unknown as Commerce[]).map((c) => ({
    ...c,
    availableBaskets: basketsByCommerce.get(c.id) ?? [],
  }));
}

export default function FavorisPage() {
  const { user, favorites, setFavorites, toggleFavorite } = useAppStore();
  const [refreshing, setRefreshing] = React.useState(false);

  // Sync favorites from DB on mount
  useEffect(() => {
    if (user?.id) {
      supabase
        .from('favorites')
        .select('commerce_id')
        .eq('client_id', user.id)
        .then(({ data }) => {
          if (data) setFavorites(data.map((f: { commerce_id: string }) => f.commerce_id));
        });
    }
  }, [user?.id, setFavorites]);

  const {
    data: favoriteCommerces = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['favorite-commerces', favorites],
    queryFn: () => fetchFavoriteCommerces(favorites),
    enabled: favorites.length > 0,
  });

  // Sort: commerces with available baskets first, then grayed out
  const sorted = [...favoriteCommerces].sort((a, b) => {
    if (a.availableBaskets.length > 0 && b.availableBaskets.length === 0) return -1;
    if (a.availableBaskets.length === 0 && b.availableBaskets.length > 0) return 1;
    return 0;
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCommercePress = (commerce: FavoriteCommerce) => {
    if (commerce.availableBaskets.length > 0) {
      // Navigate to the first available basket
      router.push(`/panier/${commerce.availableBaskets[0].id}`);
    }
  };

  const renderCommerce = ({ item }: { item: FavoriteCommerce }) => {
    const hasBaskets = item.availableBaskets.length > 0;
    const basketCount = item.availableBaskets.length;

    return (
      <TouchableOpacity
        style={[styles.card, !hasBaskets && styles.cardDimmed]}
        onPress={() => handleCommercePress(item)}
        activeOpacity={hasBaskets ? 0.92 : 1}
      >
        <View style={styles.cardRow}>
          {/* Logo / placeholder */}
          {(() => {
            const coverImage = getCommerceImage(item.photos, item.commerce_type);
            return coverImage ? (
              <Image
                source={coverImage}
                style={[styles.logo, !hasBaskets && styles.logoDimmed]}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.logoPlaceholder, !hasBaskets && styles.logoDimmed]}>
                <Ionicons name="storefront-outline" size={24} color="#9CA3AF" />
              </View>
            );
          })()}

          {/* Info */}
          <View style={styles.cardInfo}>
            <Text style={[styles.commerceName, !hasBaskets && styles.textDimmed]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.commerce_type ? (
              <Text style={[styles.commerceType, !hasBaskets && styles.textDimmedLight]} numberOfLines={1}>
                {item.commerce_type}
              </Text>
            ) : null}
            <Text style={[styles.commerceAddress, !hasBaskets && styles.textDimmedLight]} numberOfLines={1}>
              {item.address}, {item.city}
            </Text>

            {hasBaskets ? (
              <View style={styles.availableBadge}>
                <Ionicons name="basket-outline" size={13} color="#059669" />
                <Text style={styles.availableText}>
                  {basketCount} type{basketCount > 1 ? 's' : ''} de panier{basketCount > 1 ? 's' : ''} disponible{basketCount > 1 ? 's' : ''}
                </Text>
              </View>
            ) : (
              <View style={styles.unavailableBadge}>
                <Ionicons name="moon-outline" size={13} color="#9CA3AF" />
                <Text style={styles.unavailableText}>Aucun panier disponible</Text>
              </View>
            )}
          </View>

          {/* Heart button */}
          <TouchableOpacity
            style={styles.heartBtn}
            onPress={() => toggleFavorite(item.id)}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons name="heart" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Available basket previews */}
        {hasBaskets && (
          <View style={styles.basketPreviewRow}>
            {item.availableBaskets.slice(0, 3).map((b) => {
              const saving = Math.round((1 - b.sold_price / b.original_price) * 100);
              const typeInfo = BASKET_TYPE_LABELS[b.type as BasketType];
              return (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.basketChip, { borderColor: typeInfo.color + '40' }]}
                  onPress={() => router.push(`/panier/${b.id}`)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.basketChipLabel, { color: typeInfo.color }]}>{typeInfo.label}</Text>
                  <Text style={styles.basketChipPrice}>{b.sold_price.toFixed(2)}€</Text>
                  <View style={styles.basketChipSavingRow}>
                    <Text style={[styles.basketChipSaving, { color: typeInfo.color }]}>-{saving}%</Text>
                    <Text style={styles.basketChipOriginal}>{b.original_price.toFixed(2)}€</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            {basketCount > 3 && (
              <View style={styles.basketChipMore}>
                <Text style={styles.basketChipMoreText}>+{basketCount - 3}</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header */}
      <LinearGradient
        colors={['#1e2a78', '#2d4de0', '#4f6df5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.title}>Mes Favoris</Text>
        <Text style={styles.subtitle}>
          {favorites.length} commerce{favorites.length !== 1 ? 's' : ''} favori{favorites.length !== 1 ? 's' : ''}
        </Text>
      </LinearGradient>

      {isLoading && favorites.length > 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#3744C8" />
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          style={{ backgroundColor: '#F8F9FC' }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3744C8"
            />
          }
          renderItem={renderCommerce}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>❤️</Text>
              <Text style={styles.emptyTitle}>Pas encore de favoris</Text>
              <Text style={styles.emptySubtitle}>
                Explorez les paniers et appuyez sur ❤️ pour sauvegarder vos commerces préférés.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    marginTop: 3,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 20,
    paddingBottom: 30,
  },

  // ── Card ──
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#1e293b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  cardDimmed: {
    opacity: 0.55,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  logoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoDimmed: {
    opacity: 0.6,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  commerceName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  commerceType: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  commerceAddress: {
    fontSize: 12,
    color: '#6B7280',
  },
  textDimmed: {
    color: '#9CA3AF',
  },
  textDimmedLight: {
    color: '#D1D5DB',
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  availableText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  unavailableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  unavailableText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  heartBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // ── Basket preview chips ──
  basketPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  basketChip: {
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  basketChipLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  basketChipPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  basketChipSavingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  basketChipSaving: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  basketChipOriginal: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  basketChipMore: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  basketChipMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },

  // ── Empty ──
  empty: {
    paddingTop: 80,
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: 16,
  },
  emptyEmoji: {
    fontSize: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});
