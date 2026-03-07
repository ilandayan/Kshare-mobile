import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { BASKET_TYPE_LABELS, type Order } from '@/lib/types';

const STATUS_LABELS: Record<Order['status'], { label: string; color: string; bg: string }> = {
  pending: { label: 'En attente', color: '#f59e0b', bg: '#fffbeb' },
  confirmed: { label: 'Confirmé', color: '#3b82f6', bg: '#eff6ff' },
  picked_up: { label: 'Récupéré', color: '#22c55e', bg: '#f0fdf4' },
  cancelled: { label: 'Annulé', color: '#ef4444', bg: '#fef2f2' },
  refunded: { label: 'Remboursé', color: '#6b7280', bg: '#f3f4f6' },
};

async function fetchOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      id, basket_id, user_id, amount_paid, status, qr_code_token, created_at,
      baskets (
        type, pickup_start, pickup_end, description,
        commerces (name, address, city, postal_code)
      )
    `,
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Order[];
}

function OrderItem({ order }: { order: Order }) {
  const typeInfo = order.baskets?.type
    ? BASKET_TYPE_LABELS[order.baskets.type]
    : null;
  const statusInfo = STATUS_LABELS[order.status];

  const pickupDate = order.baskets?.pickup_start
    ? new Date(order.baskets.pickup_start).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
      })
    : null;

  const pickupTime = order.baskets?.pickup_start
    ? `${new Date(order.baskets.pickup_start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} – ${new Date(order.baskets.pickup_end ?? order.baskets.pickup_start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    : null;

  return (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => router.push(`/commande/${order.id}`)}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.orderEmoji,
          { backgroundColor: typeInfo?.bgColor ?? '#f3f4f6' },
        ]}
      >
        <Text style={styles.orderEmojiText}>{typeInfo?.emoji ?? '🛍️'}</Text>
      </View>

      <View style={styles.orderContent}>
        <Text style={styles.orderCommerce} numberOfLines={1}>
          {order.baskets?.commerces?.name ?? 'Commerce'}
        </Text>
        <Text style={styles.orderType} numberOfLines={1}>
          Panier {typeInfo?.label ?? ''} • {order.baskets?.commerces?.city ?? ''}
        </Text>
        <View style={styles.orderMeta}>
          {pickupDate && (
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={12} color="#6b7280" />
              <Text style={styles.metaText}>{pickupDate}</Text>
            </View>
          )}
          {pickupTime && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color="#6b7280" />
              <Text style={styles.metaText}>{pickupTime}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.orderRight}>
        <Text style={styles.orderAmount}>{order.amount_paid.toFixed(2)} €</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
      </View>
    </TouchableOpacity>
  );
}

export default function PaniersPage() {
  const { user } = useAppStore();
  const [activeTab, setActiveTab] = useState<'en_cours' | 'historique'>('en_cours');
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: orders = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: () => (user?.id ? fetchOrders(user.id) : Promise.resolve([])),
    enabled: !!user?.id,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const enCours = orders.filter((o) =>
    ['pending', 'confirmed'].includes(o.status),
  );
  const historique = orders.filter((o) =>
    ['picked_up', 'cancelled', 'refunded'].includes(o.status),
  );

  const displayedOrders = activeTab === 'en_cours' ? enCours : historique;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.title}>Mes paniers</Text>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'en_cours' && styles.tabActive]}
            onPress={() => setActiveTab('en_cours')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'en_cours' && styles.tabTextActive,
              ]}
            >
              En cours
              {enCours.length > 0 && (
                <Text style={styles.tabBadge}> {enCours.length}</Text>
              )}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'historique' && styles.tabActive]}
            onPress={() => setActiveTab('historique')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'historique' && styles.tabTextActive,
              ]}
            >
              Historique
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={displayedOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3b82f6"
            />
          }
          renderItem={({ item }) => <OrderItem order={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>
                {activeTab === 'en_cours' ? '🛍️' : '📋'}
              </Text>
              <Text style={styles.emptyTitle}>
                {activeTab === 'en_cours'
                  ? 'Aucune commande en cours'
                  : 'Aucun historique'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'en_cours'
                  ? 'Commandez votre premier panier casher !'
                  : 'Vos commandes passées apparaîtront ici.'}
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
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 4,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabActive: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#3b82f6',
  },
  tabBadge: {
    fontSize: 13,
    color: '#3b82f6',
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
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
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
  orderEmoji: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  orderEmojiText: {
    fontSize: 26,
  },
  orderContent: {
    flex: 1,
    gap: 3,
  },
  orderCommerce: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  orderType: {
    fontSize: 12,
    color: '#6b7280',
  },
  orderMeta: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    color: '#6b7280',
  },
  orderRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  orderAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 52,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
