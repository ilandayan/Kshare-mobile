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
import { CommerceCard } from '@/components/CommerceCard';
import type { Basket } from '@/lib/types';

async function fetchFavoriteBaskets(userId: string): Promise<Basket[]> {
  const { data: favs, error: favsError } = await supabase
    .from('favorites')
    .select('basket_id')
    .eq('user_id', userId);

  if (favsError) throw favsError;
  if (!favs || favs.length === 0) return [];

  const ids = favs.map((f: { basket_id: string }) => f.basket_id);

  const { data, error } = await supabase
    .from('baskets')
    .select(
      `id, type, day, description,
       original_price, sold_price,
       quantity_total, quantity_reserved, quantity_sold,
       status, is_donation, pickup_start, pickup_end, created_at, commerce_id,
       commerces (id, name, address, city, postal_code, logo_url, hashgakha, commerce_type, latitude, longitude)`,
    )
    .in('id', ids)
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
    queryFn: () =>
      user?.id ? fetchFavoriteBaskets(user.id) : Promise.resolve([]),
    enabled: !!user?.id,
  });

  // Sync favorites from DB
  useEffect(() => {
    if (user?.id) {
      supabase
        .from('favorites')
        .select('basket_id')
        .eq('user_id', user.id)
        .then(({ data }) => {
          if (data) setFavorites(data.map((f: { basket_id: string }) => f.basket_id));
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

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mes Favoris</Text>
        <Text style={styles.subtitle}>
          {favorites.length} favori{favorites.length !== 1 ? 's' : ''} enregistré{favorites.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#3744C8" />
        </View>
      ) : (
        <FlatList
          data={favoriteBaskets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3744C8"
            />
          }
          renderItem={({ item }) => (
            <CommerceCard basket={item} distanceKm={0.8} rating={4.8} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
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
    backgroundColor: '#F8F9FC',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
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
