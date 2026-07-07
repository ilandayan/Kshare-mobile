import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { BASKET_TYPE_LABELS, type Basket } from '@/lib/types';

interface NotifBasket extends Basket {
  commerce_name: string;
  commerce_city: string | null;
}

async function fetchNotificationBaskets(commerceIds: string[]): Promise<NotifBasket[]> {
  if (commerceIds.length === 0) return [];

  const { data, error } = await supabase
    .from('baskets')
    .select(
      `id, type, day, description,
       original_price, sold_price,
       quantity_total, quantity_reserved, quantity_sold,
       status, is_donation, pickup_start, pickup_end, created_at, commerce_id,
       commerces (id, name, city)`,
    )
    .in('commerce_id', commerceIds)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const baskets: NotifBasket[] = [];
  for (const b of (data ?? []) as Array<Basket & { commerces: { name: string; city: string | null } }>) {
    const remaining = b.quantity_total - b.quantity_reserved - b.quantity_sold;
    if (remaining > 0) {
      baskets.push({
        ...b,
        commerce_name: b.commerces?.name ?? '—',
        commerce_city: b.commerces?.city ?? null,
      });
    }
  }
  return baskets;
}

export default function NotificationsPage() {
  const { user, favorites, setFavorites } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);

  // Sync favoris depuis la BDD
  useEffect(() => {
    if (user?.id) {
      supabase
        .from('favorites')
        .select('commerce_id')
        .eq('client_id', user.id)
        .then(({ data }) => {
          if (data) {
            setFavorites(data.map((f) => f.commerce_id));
          }
        });
    }
  }, [user?.id, setFavorites]);

  const { data: baskets, isLoading, refetch } = useQuery({
    queryKey: ['notification-baskets', favorites],
    queryFn: () => fetchNotificationBaskets(favorites),
    enabled: favorites.length > 0,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#3744C8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      {favorites.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-off-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Aucune notification</Text>
          <Text style={styles.emptyText}>
            Ajoutez des commerces en favoris pour recevoir des notifications quand ils publient des nouveaux paniers.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push('/(tabs)/rechercher')}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyBtnText}>Découvrir les commerces</Text>
          </TouchableOpacity>
        </View>
      ) : isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#3744C8" />
        </View>
      ) : !baskets || baskets.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="basket-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Pas de panier disponible</Text>
          <Text style={styles.emptyText}>
            Aucun de vos commerces favoris n'a publié de panier disponible pour le moment.
          </Text>
        </View>
      ) : (
        <FlatList
          data={baskets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3744C8" />}
          renderItem={({ item }) => {
            const remaining = item.quantity_total - item.quantity_reserved - item.quantity_sold;
            return (
              <TouchableOpacity
                style={styles.item}
                onPress={() => router.push(`/panier/${item.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.itemIcon}>
                  <Ionicons name="basket" size={22} color="#3744C8" />
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.commerce_name}
                    {item.commerce_city ? ` · ${item.commerce_city}` : ''}
                  </Text>
                  <Text style={styles.itemSubtitle} numberOfLines={1}>
                    {BASKET_TYPE_LABELS[item.type] ?? item.type} ·{' '}
                    {item.day === 'today' ? "Aujourd'hui" : 'Demain'} ·{' '}
                    {item.pickup_start} – {item.pickup_end}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {item.is_donation ? '💜 Don solidaire' : `${item.sold_price.toFixed(2)} €`} ·{' '}
                    {remaining} restant{remaining > 1 ? 's' : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 8 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    marginTop: 16,
    backgroundColor: '#3744C8',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { padding: 16, gap: 10 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    gap: 12,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EEF0F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  itemSubtitle: { fontSize: 13, color: '#6B7280' },
  itemMeta: { fontSize: 12, color: '#3744C8', fontWeight: '600', marginTop: 2 },
});
