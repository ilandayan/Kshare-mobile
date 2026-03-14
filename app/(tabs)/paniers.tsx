import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { LinearGradient } from 'expo-linear-gradient';
import { BASKET_TYPE_LABELS, type Order, type BasketType, type OrderStatus } from '@/lib/types';
import { getCommerceImage } from '@/lib/commerceImages';
import { MOCK_ORDERS } from '@/lib/mockOrders';

// ── Badge configs ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  created:          { label: 'En attente',      bg: '#FEF3C7', color: '#D97706' },
  paid:             { label: 'En cours',         bg: '#DCFCE7', color: '#16A34A' },
  ready_for_pickup: { label: 'Prêt à retirer',  bg: '#DBEAFE', color: '#2563EB' },
  picked_up:        { label: 'Terminée',         bg: '#F3F4F6', color: '#6B7280' },
  no_show:          { label: 'Non récupéré',     bg: '#FEE2E2', color: '#EF4444' },
  refunded:         { label: 'Remboursée',       bg: '#F3F4F6', color: '#6B7280' },
  cancelled_admin:  { label: 'Annulée',          bg: '#FEE2E2', color: '#EF4444' },
};

const BASKET_BADGE: Record<string, { bg: string; text: string }> = {
  bassari: { bg: '#FEF2F2', text: '#D94452' },
  halavi:  { bg: '#EFF6FF', text: '#2E8BBE' },
  parve:   { bg: '#F0FDF4', text: '#2A9D6E' },
  shabbat: { bg: '#FFFBEB', text: '#D97B1A' },
  mix:     { bg: '#F5F3FF', text: '#7B5CC0' },
};

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

// ── Helpers ───────────────────────────────────────────────────────────────────
function getOrderNumber(id: string): string {
  const hex = id.replace(/-/g, '').slice(-6);
  const num = parseInt(hex, 16) % 1000000;
  return `KS-${String(num).padStart(6, '0')}`;
}

function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatPickupDisplay(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (isToday)     return `Aujourd'hui ${time}`;
  if (isYesterday) return `Hier ${time}`;
  const dayMon = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return `${dayMon} ${time}`;
}

// ── Fetch orders ──────────────────────────────────────────────────────────────
async function fetchOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      `id, basket_id, user_id, amount_paid, status, is_donation, qr_code_token, created_at,
       baskets (
         type, pickup_start, pickup_end, original_price, sold_price,
         description, is_donation,
         commerces (name, address, city, postal_code, logo_url, photos, commerce_type)
       ),
       associations (name)`,
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Order[];
}

// ── Order card ────────────────────────────────────────────────────────────────
function OrderCard({ order, tab }: { order: Order; tab: 'en_cours' | 'passees' | 'dons' }) {
  const basket = order.baskets;
  const commerce = basket?.commerces;
  const typeKey = basket?.type ?? 'mix';
  const typeInfo = BASKET_TYPE_LABELS[typeKey as BasketType];
  const basketBadge = BASKET_BADGE[typeKey] ?? BASKET_BADGE.mix;
  const statusInfo = STATUS_CONFIG[order.status] ?? { label: order.status, bg: '#F3F4F6', color: '#6B7280' };
  const isEnCours = tab === 'en_cours';
  const isDon = tab === 'dons';

  return (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => router.push(`/commande/${order.id}`)}
      activeOpacity={0.9}
    >
      {/* ── Card header ── */}
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.orderNumber}>{getOrderNumber(order.id)}</Text>
          <Text style={styles.orderDate}>{formatOrderDate(order.created_at)}</Text>
        </View>
        {isDon ? (
          <View style={[styles.statusBadge, { backgroundColor: '#F3E8FF' }]}>
            <Text style={{ fontSize: 11, marginRight: 3 }}>🎁</Text>
            <Text style={[styles.statusText, { color: '#9333EA' }]}>Don</Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        )}
      </View>

      {/* ── Divider ── */}
      <View style={styles.cardDivider} />

      {/* ── Card body ── */}
      <View style={styles.cardBody}>
        {/* Thumbnail */}
        <View style={styles.thumb}>
          {(() => {
            const coverImage = getCommerceImage(commerce?.photos, commerce?.commerce_type);
            return coverImage ? (
              <Image source={coverImage} style={styles.thumbImg} resizeMode="cover" />
            ) : (
              <View style={[styles.thumbPlaceholder, { backgroundColor: typeInfo.bgColor }]}>
                <MaterialCommunityIcons
                  name={getCommerceIcon(commerce?.commerce_type)}
                  size={30}
                  color="#9CA3AF"
                />
              </View>
            );
          })()}
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <View style={styles.cardInfoRow}>
            <Text style={styles.commerceName} numberOfLines={1}>
              {commerce?.name ?? 'Commerce'}
            </Text>
            {/* Category badge (top-right) */}
            <View style={[styles.catBadge, { backgroundColor: basketBadge.bg }]}>
              <Text style={[styles.catBadgeText, { color: basketBadge.text }]}>
                {typeInfo.label}
              </Text>
            </View>
          </View>

          <Text style={styles.commerceType}>
            {commerce?.commerce_type ?? ''}
          </Text>

          {basket?.pickup_start && (
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={12} color="#6B7280" />
              <Text style={styles.timeText}>
                {formatPickupDisplay(basket.pickup_start)}
              </Text>
            </View>
          )}

          {/* Donation text */}
          {isDon && order.associations?.name && (
            <View style={styles.donRow}>
              <Text style={styles.donEmoji}>🎁</Text>
              <Text style={styles.donText}>Don à {order.associations.name}</Text>
            </View>
          )}

          {/* Prices */}
          <View style={styles.priceRow}>
            {basket?.original_price !== undefined && (
              <Text style={styles.origPrice}>{basket.original_price.toFixed(2)}€</Text>
            )}
            <Text style={styles.soldPrice}>
              {(basket?.sold_price ?? order.amount_paid).toFixed(2)}€
            </Text>

            {/* Détails button — En cours only */}
            {isEnCours && (
              <TouchableOpacity
                style={styles.detailsBtn}
                onPress={() => router.push(`/commande/${order.id}`)}
              >
                <Text style={styles.detailsBtnText}>Détails</Text>
                <Ionicons name="chevron-forward" size={13} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
type TabKey = 'en_cours' | 'passees' | 'dons';

export default function PaniersPage() {
  const { user } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabKey>('en_cours');
  const [refreshing, setRefreshing] = useState(false);

  const { data: rawOrders = [], isLoading, refetch } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: () => (user?.id ? fetchOrders(user.id) : Promise.resolve([])),
    enabled: !!user?.id,
  });

  // Use mock data when no real orders exist (demo mode)
  const orders = rawOrders.length > 0 ? rawOrders : MOCK_ORDERS;
  const isDemo = rawOrders.length === 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const enCours  = orders.filter((o) => ['created', 'paid', 'ready_for_pickup'].includes(o.status) && !o.is_donation);
  const passees  = orders.filter((o) => ['picked_up', 'no_show', 'cancelled_admin', 'refunded'].includes(o.status) && !o.is_donation);
  const dons     = orders.filter((o) => o.is_donation);

  const tabOrders: Record<TabKey, Order[]> = { en_cours: enCours, passees, dons };
  const displayed = tabOrders[activeTab];

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'en_cours', label: 'En cours' },
    { key: 'passees',  label: 'Passées'  },
    { key: 'dons',     label: 'Dons'     },
  ];

  const totalCount = displayed.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <LinearGradient
        colors={['#1e2a78', '#2d4de0', '#4f6df5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.title}>Mes Paniers</Text>
        <Text style={styles.subtitle}>
          {totalCount} panier{totalCount !== 1 ? 's' : ''}
        </Text>

        {/* Tab pills */}
        <View style={styles.tabs}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabPill, activeTab === t.key && styles.tabPillActive]}
              onPress={() => setActiveTab(t.key)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabPillText,
                  activeTab === t.key && styles.tabPillTextActive,
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* Demo banner */}
      {isDemo && (
        <View style={styles.demoBanner}>
          <Text style={styles.demoBannerText}>Données de démonstration</Text>
        </View>
      )}

      {/* ── List ── */}
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#3744C8" />
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3744C8" />
          }
          renderItem={({ item }) => <OrderCard order={item} tab={activeTab} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>
                {activeTab === 'en_cours' ? '🛍️' : activeTab === 'dons' ? '🎁' : '📋'}
              </Text>
              <Text style={styles.emptyTitle}>
                {activeTab === 'en_cours'
                  ? 'Aucune commande en cours'
                  : activeTab === 'dons'
                    ? 'Aucun don effectué'
                    : 'Aucune commande passée'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'en_cours'
                  ? 'Commandez votre premier panier casher !'
                  : activeTab === 'dons'
                    ? 'Faites un don (Mitzvah) depuis la page d\'un panier.'
                    : 'Votre historique apparaîtra ici.'}
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

  // Header
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
    marginBottom: 16,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tabPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  tabPillActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  tabPillTextActive: {
    color: '#1e2a78',
  },

  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },

  // Order card
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0F1F5',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  orderNumber: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  cardBody: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: 'hidden',
    flexShrink: 0,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbInitial: {
    fontSize: 28,
    fontWeight: '800',
    color: '#3744C8',
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  commerceName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#3744C8',
  },
  catBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  commerceType: {
    fontSize: 12,
    color: '#6B7280',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  donRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  donEmoji: {
    fontSize: 12,
  },
  donText: {
    fontSize: 12,
    color: '#9333EA',
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  origPrice: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  soldPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3744C8',
  },
  detailsBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3744C8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 2,
  },
  detailsBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Demo banner
  demoBanner: {
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    paddingVertical: 6,
    alignItems: 'center',
  },
  demoBannerText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },

  // Empty
  empty: {
    paddingTop: 60,
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
