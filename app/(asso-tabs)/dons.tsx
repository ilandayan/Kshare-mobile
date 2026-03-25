import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { BASKET_TYPE_LABELS, type BasketType } from '@/lib/types';

// ── Commerce type icons ──────────────────────────────────────────
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

// ── Types ────────────────────────────────────────────────────────
interface DonBasket {
  id: string;
  type: BasketType;
  description: string | null;
  quantity_total: number;
  quantity_reserved: number;
  pickup_start: string;
  pickup_end: string;
  day: string;
  commerces: {
    name: string;
    address: string;
    city: string;
    postal_code: string | null;
    commerce_type: string | null;
  } | null;
}

// ── Helpers ──────────────────────────────────────────────────────
function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(day: string): string {
  return day === 'today' ? "Aujourd'hui" : 'Demain';
}

// ── Fetch ────────────────────────────────────────────────────────
async function fetchAssoDepartment(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('associations')
    .select('department')
    .eq('profile_id', userId)
    .single();
  return data?.department ?? null;
}

async function fetchAssoId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('associations')
    .select('id')
    .eq('profile_id', userId)
    .single();
  return data?.id ?? null;
}

async function fetchDonBaskets(department: string): Promise<DonBasket[]> {
  const { data, error } = await supabase
    .from('baskets')
    .select(`
      id, type, description, quantity_total, quantity_reserved,
      pickup_start, pickup_end, day,
      commerces!inner(name, address, city, postal_code, commerce_type)
    `)
    .eq('is_donation', true)
    .eq('status', 'published')
    .gte('quantity_total', 1)
    .like('commerces.postal_code', `${department}%`)
    .order('pickup_start', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as DonBasket[];
}

// ── Reserve action ───────────────────────────────────────────────
async function reserveDonBasket(basketId: string, assoId: string, userId: string) {
  // Create a donation order assigned to this association
  const { error } = await supabase.from('orders').insert({
    basket_id: basketId,
    user_id: userId,
    association_id: assoId,
    is_donation: true,
    status: 'paid', // donation = no payment needed, goes straight to confirmed
    amount_paid: 0,
  });
  if (error) throw error;

  // Update basket reserved count
  await supabase.rpc('update_basket_quantity', {
    p_basket_id: basketId,
    p_delta: 1,
  });
}

// ── Component ────────────────────────────────────────────────────
export default function DonsScreen() {
  const insets = useSafeAreaInsets();
  const user = useAppStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: department, isLoading: loadingDept } = useQuery({
    queryKey: ['asso-department', user?.id],
    queryFn: () => fetchAssoDepartment(user!.id),
    enabled: !!user,
  });

  const { data: assoId } = useQuery({
    queryKey: ['asso-id', user?.id],
    queryFn: () => fetchAssoId(user!.id),
    enabled: !!user,
  });

  const {
    data: baskets = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['don-baskets', department],
    queryFn: () => fetchDonBaskets(department!),
    enabled: !!department,
  });

  const reserveMutation = useMutation({
    mutationFn: ({ basketId }: { basketId: string }) =>
      reserveDonBasket(basketId, assoId!, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['don-baskets'] });
      queryClient.invalidateQueries({ queryKey: ['asso-reservations'] });
    },
  });

  const available = baskets.filter(
    (b) => b.quantity_total - b.quantity_reserved > 0
  );

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (loadingDept || isLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#2a9d6e" />
      </View>
    );
  }

  const renderItem = ({ item }: { item: DonBasket }) => {
    const typeInfo = BASKET_TYPE_LABELS[item.type];
    const remaining = item.quantity_total - item.quantity_reserved;
    const commerce = item.commerces;

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.typeDot, { backgroundColor: typeInfo.color }]} />
          <Text style={styles.typeLabel}>{typeInfo.label}</Text>
          <Text style={styles.dayBadge}>{formatDay(item.day)}</Text>
        </View>

        {/* Commerce */}
        <View style={styles.commerceRow}>
          <View style={[styles.commerceIcon, { backgroundColor: typeInfo.bgColor }]}>
            <MaterialCommunityIcons
              name={getCommerceIcon(commerce?.commerce_type)}
              size={22}
              color="#9CA3AF"
            />
          </View>
          <View style={styles.commerceInfo}>
            <Text style={styles.commerceName} numberOfLines={1}>
              {commerce?.name ?? 'Commerce'}
            </Text>
            <Text style={styles.commerceAddress} numberOfLines={1}>
              {commerce?.city ?? ''}
            </Text>
          </View>
        </View>

        {/* Description */}
        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.infoChips}>
            <View style={styles.chip}>
              <Ionicons name="time-outline" size={14} color="#6B7280" />
              <Text style={styles.chipText}>
                {formatTime(item.pickup_start)} - {formatTime(item.pickup_end)}
              </Text>
            </View>
            <View style={styles.chip}>
              <Ionicons name="cube-outline" size={14} color="#6B7280" />
              <Text style={styles.chipText}>
                {remaining} dispo
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.reserveBtn,
              reserveMutation.isPending && styles.reserveBtnDisabled,
            ]}
            onPress={() => reserveMutation.mutate({ basketId: item.id })}
            disabled={reserveMutation.isPending || !assoId}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.reserveBtnText}>Réserver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Dons disponibles</Text>
        <Text style={styles.subtitle}>
          Département {department ?? '—'} · {available.length} panier{available.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {available.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="gift-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Aucun don disponible</Text>
          <Text style={styles.emptyText}>
            Les paniers dons de votre département apparaîtront ici.
          </Text>
        </View>
      ) : (
        <FlatList
          data={available}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
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
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },

  list: { paddingHorizontal: 16, paddingBottom: 24 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  typeDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  typeLabel: { fontSize: 14, fontWeight: '700', color: '#374151', flex: 1 },
  dayBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2a9d6e',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },

  commerceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  commerceIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  commerceInfo: { flex: 1 },
  commerceName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  commerceAddress: { fontSize: 13, color: '#6B7280', marginTop: 1 },

  description: { fontSize: 13, color: '#6B7280', marginBottom: 10, lineHeight: 18 },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoChips: { flexDirection: 'row', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipText: { fontSize: 12, color: '#6B7280' },

  reserveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2a9d6e',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  reserveBtnDisabled: { opacity: 0.5 },
  reserveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 8 },
});
