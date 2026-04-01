import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { BASKET_TYPE_LABELS, type BasketType, type OrderStatus } from '@/lib/types';

// ── Commerce icons ───────────────────────────────────────────────
const COMMERCE_TYPE_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  Boucherie: 'food-steak',
  Boulangerie: 'bread-slice',
  Supermarché: 'cart-outline',
  Traiteur: 'food-variant',
  Épicerie: 'storefront-outline',
  Restaurant: 'silverware-fork-knife',
  Fromagerie: 'cheese',
  Pâtisserie: 'cupcake',
};

function getCommerceIcon(type: string | null | undefined): keyof typeof MaterialCommunityIcons.glyphMap {
  if (!type) return 'storefront-outline';
  return COMMERCE_TYPE_ICONS[type] ?? 'storefront-outline';
}

// ── Status config ────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  created:          { label: 'En attente',      bg: '#FEF3C7', color: '#D97706', icon: 'hourglass-outline' },
  paid:             { label: 'Confirmée',        bg: '#DCFCE7', color: '#16A34A', icon: 'checkmark-circle-outline' },
  ready_for_pickup: { label: 'Prêt à retirer',  bg: '#DBEAFE', color: '#2563EB', icon: 'bag-check-outline' },
  picked_up:        { label: 'Récupéré',         bg: '#F3F4F6', color: '#6B7280', icon: 'checkmark-done' },
  no_show:          { label: 'Non récupéré',     bg: '#FEE2E2', color: '#EF4444', icon: 'close-circle-outline' },
  refunded:         { label: 'Annulée',          bg: '#F3F4F6', color: '#6B7280', icon: 'return-down-back-outline' },
  cancelled_admin:  { label: 'Annulée',          bg: '#FEE2E2', color: '#EF4444', icon: 'ban-outline' },
};

// ── Types ────────────────────────────────────────────────────────
interface AssoOrder {
  id: string;
  status: OrderStatus;
  created_at: string;
  baskets: {
    type: BasketType;
    pickup_start: string;
    pickup_end: string;
    description: string | null;
    commerces: {
      name: string;
      address: string;
      city: string;
      commerce_type: string | null;
    } | null;
  } | null;
}

// ── Helpers ──────────────────────────────────────────────────────
function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ── Fetch ────────────────────────────────────────────────────────
async function fetchAssoReservations(userId: string): Promise<AssoOrder[]> {
  // First get association ID
  const { data: asso } = await supabase
    .from('associations')
    .select('id')
    .eq('profile_id', userId)
    .single();

  if (!asso) return [];

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, status, created_at,
      baskets(type, pickup_start, pickup_end, description,
        commerces(name, address, city, commerce_type))
    `)
    .eq('association_id', asso.id)
    .eq('is_donation', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as AssoOrder[];
}

// ── Validate pickup ──────────────────────────────────────────────
async function validatePickup(orderId: string) {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'picked_up', picked_up_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw error;
}

// ── Component ────────────────────────────────────────────────────
export default function ReservationsScreen() {
  const insets = useSafeAreaInsets();
  const user = useAppStore((s) => s.user);
  const queryClient = useQueryClient();

  const {
    data: orders = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['asso-reservations', user?.id],
    queryFn: () => fetchAssoReservations(user!.id),
    enabled: !!user,
  });

  const pickupMutation = useMutation({
    mutationFn: validatePickup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asso-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['don-baskets'] });
    },
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Separate into pending and completed
  const pending = orders.filter((o) =>
    ['created', 'paid', 'ready_for_pickup'].includes(o.status)
  );
  const completed = orders.filter((o) =>
    ['picked_up', 'no_show', 'refunded', 'cancelled_admin'].includes(o.status)
  );

  const sections = [
    ...(pending.length > 0 ? [{ title: `En attente (${pending.length})`, data: pending }] : []),
    ...(completed.length > 0 ? [{ title: `Historique (${completed.length})`, data: completed }] : []),
  ];

  const confirmPickup = (orderId: string, commerceName: string) => {
    Alert.alert(
      'Confirmer la récupération',
      `Confirmez-vous avoir récupéré le panier don chez ${commerceName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'default',
          onPress: () => pickupMutation.mutate(orderId),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#2a9d6e" />
      </View>
    );
  }

  const renderItem = ({ item }: { item: AssoOrder }) => {
    const basket = item.baskets;
    const typeInfo = basket ? BASKET_TYPE_LABELS[basket.type] : null;
    const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.created;
    const commerce = basket?.commerces;
    const isPending = ['created', 'paid', 'ready_for_pickup'].includes(item.status);

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          {/* Commerce icon */}
          <View style={[styles.iconBox, { backgroundColor: typeInfo?.bgColor ?? '#F3F4F6' }]}>
            <MaterialCommunityIcons
              name={getCommerceIcon(commerce?.commerce_type)}
              size={24}
              color="#9CA3AF"
            />
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.commerceName} numberOfLines={1}>
              {commerce?.name ?? 'Commerce'}
            </Text>
            <View style={styles.metaRow}>
              {typeInfo && (
                <View style={[styles.typeBadge, { backgroundColor: typeInfo.bgColor }]}>
                  <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>
                    {typeInfo.label}
                  </Text>
                </View>
              )}
              {basket?.pickup_start && (
                <View style={styles.timeChip}>
                  <Ionicons name="time-outline" size={12} color="#6B7280" />
                  <Text style={styles.timeText}>
                    {formatDate(basket.pickup_start)} · {formatTime(basket.pickup_start)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Status badge */}
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={14} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        {/* Validate pickup button for pending orders */}
        {isPending && (
          <TouchableOpacity
            style={styles.pickupBtn}
            onPress={() => confirmPickup(item.id, commerce?.name ?? 'Commerce')}
            disabled={pickupMutation.isPending}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-done-circle" size={20} color="#fff" />
            <Text style={styles.pickupBtnText}>Valider la récupération</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mes réservations</Text>
        {/* KPI row */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { backgroundColor: '#DCFCE7' }]}>
            <Text style={[styles.kpiNumber, { color: '#16A34A' }]}>{pending.length}</Text>
            <Text style={styles.kpiLabel}>En attente</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: '#F3F4F6' }]}>
            <Text style={[styles.kpiNumber, { color: '#6B7280' }]}>
              {orders.filter((o) => o.status === 'picked_up').length}
            </Text>
            <Text style={styles.kpiLabel}>Récupérés</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: '#EFF6FF' }]}>
            <Text style={[styles.kpiNumber, { color: '#2563EB' }]}>{orders.length}</Text>
            <Text style={styles.kpiLabel}>Total</Text>
          </View>
        </View>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="clipboard-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Aucune réservation</Text>
          <Text style={styles.emptyText}>
            Réservez des paniers dons dans l'onglet "Dons" pour les voir ici.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionTitle}>{title}</Text>
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor="#2a9d6e"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECEEF4' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECEEF4' },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827' },

  kpiRow: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 8 },
  kpiCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  kpiNumber: { fontSize: 22, fontWeight: '800' },
  kpiLabel: { fontSize: 11, fontWeight: '600', color: '#6B7280', marginTop: 2 },

  list: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e5f0',
    ...Platform.select({
      ios: {
        shadowColor: '#1e293b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
      },
      android: { elevation: 5 },
    }),
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },

  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  cardContent: { flex: 1 },
  commerceName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },

  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },

  timeChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeText: { fontSize: 11, color: '#6B7280' },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  pickupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2a9d6e',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  pickupBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 8 },
});
