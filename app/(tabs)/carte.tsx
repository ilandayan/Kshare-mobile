import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
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
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { BASKET_TYPE_LABELS, type Basket } from '@/lib/types';

const BADGE_CONFIG: Record<string, { bg: string; text: string }> = {
  bassari: { bg: '#EF4444', text: '#fff' },
  halavi:  { bg: '#3B82F6', text: '#fff' },
  parve:   { bg: '#10B981', text: '#fff' },
  shabbat: { bg: '#F59E0B', text: '#fff' },
  mix:     { bg: '#8B5CF6', text: '#fff' },
};

async function fetchNearbyBaskets(): Promise<Basket[]> {
  const { data, error } = await supabase
    .from('baskets')
    .select(
      `id, type, day, description,
       original_price, sold_price,
       quantity_total, quantity_reserved, quantity_sold,
       status, is_donation, pickup_start, pickup_end, created_at, commerce_id,
       commerces (id, name, address, city, postal_code, logo_url, hashgakha, commerce_type, latitude, longitude)`,
    )
    .eq('status', 'published')
    .eq('day', 'today')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []) as unknown as Basket[];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ── Fake map pins ─────────────────────────────────────────────────────────────
const MAP_PINS = [
  { top: '30%', left: '32%' },
  { top: '22%', left: '62%' },
  { top: '55%', left: '48%' },
];

function MapPlaceholder() {
  return (
    <View style={styles.mapContainer}>
      {/* Grid pattern */}
      {Array.from({ length: 6 }).map((_, i) => (
        <View
          key={`h${i}`}
          style={[
            styles.mapGridLine,
            styles.mapGridLineH,
            { top: `${(i + 1) * 14}%` },
          ]}
        />
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <View
          key={`v${i}`}
          style={[
            styles.mapGridLine,
            styles.mapGridLineV,
            { left: `${(i + 1) * 14}%` },
          ]}
        />
      ))}
      {/* Location pins */}
      {MAP_PINS.map((pin, i) => (
        <View
          key={i}
          style={[styles.pinContainer, { top: pin.top as any, left: pin.left as any }]}
        >
          <View style={styles.pinHead}>
            <View style={styles.pinInner} />
          </View>
          <View style={styles.pinTail} />
        </View>
      ))}
      {/* Current position dot */}
      <View style={styles.currentDot} />
    </View>
  );
}

// ── Proximity list item ───────────────────────────────────────────────────────
function CommerceListItem({ basket }: { basket: Basket }) {
  const typeInfo = BASKET_TYPE_LABELS[basket.type];
  const badge = BADGE_CONFIG[basket.type] ?? { bg: '#6B7280', text: '#fff' };
  const commerce = basket.commerces;

  return (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => router.push(`/panier/${basket.id}`)}
      activeOpacity={0.88}
    >
      {/* Thumbnail */}
      <View style={styles.thumbnail}>
        {commerce?.logo_url ? (
          <Image source={{ uri: commerce.logo_url }} style={styles.thumbnailImg} resizeMode="cover" />
        ) : (
          <View style={[styles.thumbnailPlaceholder, { backgroundColor: typeInfo.bgColor }]}>
            <Text style={styles.thumbnailEmoji}>{typeInfo.emoji}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.listInfo}>
        <Text style={styles.listCommerceName} numberOfLines={1}>
          {commerce?.name ?? 'Commerce'}
        </Text>
        <Text style={styles.listCommerceType} numberOfLines={1}>
          {commerce?.commerce_type ?? commerce?.hashgakha ?? ''}
        </Text>
        <View style={styles.listMeta}>
          <Ionicons name="location-outline" size={11} color="#6B7280" />
          <Text style={styles.listMetaText}>0.8 km</Text>
          <Ionicons name="time-outline" size={11} color="#6B7280" style={{ marginLeft: 6 }} />
          <Text style={styles.listMetaText}>
            {formatTime(basket.pickup_start)} - {formatTime(basket.pickup_end)}
          </Text>
        </View>
        {/* Prices */}
        <View style={styles.listPriceRow}>
          <Text style={styles.listOriginalPrice}>{basket.original_price.toFixed(2)}€</Text>
          <Text style={styles.listSoldPrice}>{basket.sold_price.toFixed(2)}€</Text>
        </View>
      </View>

      {/* Badge */}
      <View style={[styles.listBadge, { backgroundColor: badge.bg }]}>
        <Text style={[styles.listBadgeText, { color: badge.text }]}>{typeInfo.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CartePage() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: baskets = [], isLoading, refetch } = useQuery({
    queryKey: ['baskets-carte'],
    queryFn: fetchNearbyBaskets,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const available = baskets.filter(
    (b) => b.quantity_total - b.quantity_reserved - b.quantity_sold > 0,
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      {/* Map */}
      <MapPlaceholder />

      {/* Bottom sheet */}
      <View style={styles.sheet}>
        {/* Drag handle */}
        <View style={styles.dragHandle} />
        <Text style={styles.sheetTitle}>Commerces à proximité</Text>

        {isLoading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#3744C8" />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3744C8" />
            }
          >
            {available.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Aucun commerce à proximité</Text>
              </View>
            ) : (
              available.map((b, i) => (
                <React.Fragment key={b.id}>
                  <CommerceListItem basket={b} />
                  {i < available.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))
            )}
            <View style={{ height: 20 }} />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8EDF5',
  },

  // Map
  mapContainer: {
    height: '42%',
    backgroundColor: '#DAE4F0',
    position: 'relative',
    overflow: 'hidden',
  },
  mapGridLine: {
    position: 'absolute',
    backgroundColor: '#C8D6E5',
  },
  mapGridLineH: {
    left: 0,
    right: 0,
    height: 1,
  },
  mapGridLineV: {
    top: 0,
    bottom: 0,
    width: 1,
  },
  pinContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  pinHead: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3744C8',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#3744C8',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 5,
      },
      android: { elevation: 4 },
    }),
  },
  pinInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#3744C8',
    marginTop: -1,
  },
  currentDot: {
    position: 'absolute',
    top: '18%',
    left: '50%',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#3744C8',
    borderWidth: 3,
    borderColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#3744C8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },

  // Sheet
  sheet: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingTop: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
    }),
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sheetContent: {
    paddingHorizontal: 20,
  },
  loader: {
    paddingTop: 40,
    alignItems: 'center',
  },
  empty: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
  },

  // List item
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  thumbnail: {
    width: 66,
    height: 66,
    borderRadius: 12,
    overflow: 'hidden',
    flexShrink: 0,
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailEmoji: {
    fontSize: 28,
  },
  listInfo: {
    flex: 1,
    gap: 2,
  },
  listCommerceName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  listCommerceType: {
    fontSize: 12,
    color: '#6B7280',
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  listMetaText: {
    fontSize: 11,
    color: '#6B7280',
  },
  listPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  listOriginalPrice: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  listSoldPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3B82F6',
  },
  listBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  listBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 78,
  },
});
