import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { BasketCard } from '@/components/BasketCard';
import type { Basket } from '@/lib/types';

async function fetchFavoriteBaskets(userId: string): Promise<Basket[]> {
  // First, get favorite basket IDs
  const { data: favs, error: favsError } = await supabase
    .from('favorites')
    .select('basket_id')
    .eq('user_id', userId);

  if (favsError) throw favsError;
  if (!favs || favs.length === 0) return [];

  const basketIds = favs.map((f: { basket_id: string }) => f.basket_id);

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
    .in('id', basketIds)
    .eq('status', 'published');

  if (error) throw error;
  return (data ?? []) as unknown as Basket[];
}

export default function FavorisPage() {
  const { user, favorites, setFavorites } = useAppStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const {
    data: favoriteBaskets = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: () => (user?.id ? fetchFavoriteBaskets(user.id) : Promise.resolve([])),
    enabled: !!user?.id,
  });

  // Sync favorites from DB into store on mount
  useEffect(() => {
    if (user?.id) {
      supabase
        .from('favorites')
        .select('basket_id')
        .eq('user_id', user.id)
        .then(({ data }) => {
          if (data) {
            setFavorites(data.map((f: { basket_id: string }) => f.basket_id));
          }
        });
    }
  }, [user?.id, setFavorites]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.title}>Favoris</Text>
        {favorites.length > 0 && (
          <Text style={styles.subtitle}>
            {favorites.length} panier{favorites.length > 1 ? 's' : ''} sauvegardé{favorites.length > 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={favoriteBaskets}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3b82f6"
            />
          }
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <BasketCard basket={item} />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>❤️</Text>
              <Text style={styles.emptyTitle}>Pas encore de favoris</Text>
              <Text style={styles.emptySubtitle}>
                Explorez les paniers et appuyez sur ❤️ pour les sauvegarder ici.
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
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  columnWrapper: {
    gap: 12,
    marginBottom: 12,
  },
  cardWrapper: {
    flex: 1,
  },
  emptyContainer: {
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
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});
