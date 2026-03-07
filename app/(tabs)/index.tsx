import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { CommerceCard } from '@/components/CommerceCard';
import type { Basket, BasketType } from '@/lib/types';

// ── Category config ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { type: 'bassari', label: 'Bassari', bg: '#FF6B82', icon: 'restaurant-outline' as const },
  { type: 'halavi',  label: 'Halavi',  bg: '#5BB8E8', icon: 'water-outline'      as const },
  { type: 'parve',   label: 'Parvé',   bg: '#4BC8A0', icon: 'leaf-outline'       as const },
  { type: 'shabbat', label: 'Shabbat', bg: '#FF9A3E', icon: 'wine-outline'       as const },
  { type: 'mix',     label: 'Mix',     bg: '#9B7FE8', icon: 'grid-outline'       as const },
];

type TimeFilter = 'now' | 'today' | 'tomorrow';

// ── Data fetching ─────────────────────────────────────────────────────────────
async function fetchBaskets(day: 'today' | 'tomorrow'): Promise<Basket[]> {
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
    .eq('day', day)
    .order('created_at', { ascending: false })
    .limit(40);

  if (error) throw error;
  return (data ?? []) as unknown as Basket[];
}

// ── Distance slider (custom, no external dep) ─────────────────────────────────
function DistanceSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const min = 1, max = 20;
  const pct = (value - min) / (max - min);
  const filledWidth = trackWidth * pct;
  const knobLeft = trackWidth * pct - 11;

  return (
    <View>
      <TouchableOpacity
        activeOpacity={1}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        onPress={(e) => {
          if (!trackWidth) return;
          const x = e.nativeEvent.locationX;
          const ratio = Math.max(0, Math.min(1, x / trackWidth));
          onChange(Math.round(min + ratio * (max - min)));
        }}
        style={styles.sliderTrackOuter}
      >
        <View style={styles.sliderTrackBg} />
        {trackWidth > 0 && (
          <>
            <View style={[styles.sliderTrackFill, { width: filledWidth }]} />
            <View style={[styles.sliderKnob, { left: knobLeft }]} />
          </>
        )}
      </TouchableOpacity>
      <View style={styles.sliderLabelRow}>
        <Text style={styles.sliderLabel}>1 km</Text>
        <Text style={styles.sliderLabel}>20 km</Text>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AccueilPage() {
  const [location, setLocation] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('now');
  const [selectedCategory, setSelectedCategory] = useState<BasketType | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [distance, setDistance] = useState(5);
  const [refreshing, setRefreshing] = useState(false);

  const filterAnim = useRef(new Animated.Value(0)).current;

  const day = timeFilter === 'tomorrow' ? 'tomorrow' : 'today';

  const { data: baskets = [], isLoading, refetch } = useQuery({
    queryKey: ['baskets-home', day],
    queryFn: () => fetchBaskets(day),
  });

  // Geo: get city name
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [addr] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (addr?.city) {
        const district = addr.district ?? addr.subregion ?? '';
        setLocation(`${addr.city}${district ? ` • ${district}` : ''}`);
      }
    })();
  }, []);

  // Animate filter panel
  useEffect(() => {
    Animated.timing(filterAnim, {
      toValue: showFilter ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [showFilter, filterAnim]);

  const filterPanelHeight = filterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 160],
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Filter baskets by category
  const displayed = baskets.filter((b) => {
    const hasStock = b.quantity_total - b.quantity_reserved - b.quantity_sold > 0;
    const matchCat = !selectedCategory || b.type === selectedCategory;
    return hasStock && matchCat;
  });

  const TIME_TABS: { key: TimeFilter; label: string }[] = [
    { key: 'now',      label: "Maintenant" },
    { key: 'today',    label: "Aujourd'hui" },
    { key: 'tomorrow', label: 'Demain' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3744C8" />
        }
      >
        {/* ── Location bar ── */}
        <View style={styles.locationBar}>
          <Ionicons name="location-outline" size={15} color="#6B7280" />
          <Text style={styles.locationText}>
            {location ?? 'Localisation en cours…'}
          </Text>
        </View>

        {/* ── Catégories ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>CATÉGORIES</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.type;
            return (
              <TouchableOpacity
                key={cat.type}
                style={styles.catItem}
                onPress={() =>
                  setSelectedCategory(active ? null : (cat.type as BasketType))
                }
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.catIconBox,
                    { backgroundColor: cat.bg },
                    active && styles.catIconBoxActive,
                  ]}
                >
                  <Ionicons name={cat.icon} size={24} color="#fff" />
                </View>
                <Text style={styles.catLabel}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Time filter row ── */}
        <View style={styles.timeRow}>
          {TIME_TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.timePill,
                timeFilter === t.key && styles.timePillActive,
              ]}
              onPress={() => setTimeFilter(t.key)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.timePillText,
                  timeFilter === t.key && styles.timePillTextActive,
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.filterIconBtn, showFilter && styles.filterIconBtnActive]}
            onPress={() => setShowFilter((v) => !v)}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={showFilter ? '#3744C8' : '#6B7280'}
            />
          </TouchableOpacity>
        </View>

        {/* ── Filter panel ── */}
        <Animated.View style={[styles.filterPanel, { height: filterPanelHeight, overflow: 'hidden' }]}>
          <View style={styles.filterPanelInner}>
            <View style={styles.filterPanelHeader}>
              <Text style={styles.filterPanelTitle}>Filtres</Text>
              <TouchableOpacity onPress={() => setShowFilter(false)}>
                <Ionicons name="close" size={20} color="#374151" />
              </TouchableOpacity>
            </View>
            <View style={styles.filterRow}>
              <Text style={styles.filterRowLabel}>Distance maximale</Text>
              <Text style={styles.filterRowValue}>{distance} km</Text>
            </View>
            <DistanceSlider value={distance} onChange={setDistance} />
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => setShowFilter(false)}
            >
              <Text style={styles.applyBtnText}>Appliquer les filtres</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Section header ── */}
        <View style={styles.availRow}>
          <Text style={styles.availLabel}>
            {timeFilter === 'tomorrow' ? 'DISPONIBLE DEMAIN' : 'DISPONIBLE MAINTENANT'}
          </Text>
          <TouchableOpacity>
            <Text style={styles.availLink}>Tout voir</Text>
          </TouchableOpacity>
        </View>

        {/* ── Commerce cards ── */}
        {isLoading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#3744C8" />
          </View>
        ) : displayed.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌙</Text>
            <Text style={styles.emptyTitle}>Pas de paniers disponibles</Text>
            <Text style={styles.emptySubtitle}>
              Revenez plus tard ou essayez une autre catégorie.
            </Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            {displayed.map((b) => (
              <CommerceCard key={b.id} basket={b} distanceKm={0.8} rating={4.8} />
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },

  // Location bar
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 4,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  locationText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },

  // Categories
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  catRow: {
    paddingHorizontal: 20,
    gap: 20,
    paddingBottom: 4,
  },
  catItem: {
    alignItems: 'center',
    gap: 6,
  },
  catIconBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catIconBoxActive: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: { elevation: 5 },
    }),
  },
  catLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
  },

  // Time filter
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
  },
  timePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timePillActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  timePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  timePillTextActive: {
    color: '#fff',
  },
  filterIconBtn: {
    marginLeft: 'auto',
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIconBtnActive: {
    borderColor: '#3744C8',
    backgroundColor: '#EEF0FF',
  },

  // Filter panel
  filterPanel: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterPanelInner: {
    padding: 16,
    gap: 12,
  },
  filterPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterPanelTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterRowLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  filterRowValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3744C8',
  },
  // Slider
  sliderTrackOuter: {
    height: 22,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },
  sliderTrackFill: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3744C8',
  },
  sliderKnob: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#3744C8',
    top: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#3744C8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  applyBtn: {
    backgroundColor: '#3744C8',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Available section
  availRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  availLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  availLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3744C8',
  },

  // Cards
  cardList: {
    paddingHorizontal: 20,
  },
  loader: {
    paddingTop: 60,
    alignItems: 'center',
  },
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
