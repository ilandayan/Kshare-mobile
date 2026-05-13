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
  PanResponder,
  Image,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
// expo-location: only used on native platforms
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { CommerceCard } from '@/components/CommerceCard';
import { LinearGradient } from 'expo-linear-gradient';
import type { Basket, BasketType } from '@/lib/types';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import { router } from 'expo-router';
import { useAppStore } from '@/lib/store';

// ── Category config ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { type: 'bassari', label: 'Bassari', bg: '#D94452', icon: 'food-steak',       lib: 'mci' as const },
  { type: 'halavi',  label: 'Halavi',  bg: '#2E8BBE', icon: 'cheese',           lib: 'mci' as const },
  { type: 'parve',   label: 'Parvé',   bg: '#2A9D6E', icon: 'leaf-outline',     lib: 'ion' as const },
  { type: 'shabbat', label: 'Shabbat', bg: '#D97B1A', icon: 'wine-outline',     lib: 'ion' as const },
  { type: 'mix',     label: 'Mix',     bg: '#7B5CC0', icon: 'grid-outline',     lib: 'ion' as const },
];

const COMMERCE_TYPES = [
  { key: 'Boucherie',    label: 'Boucherie',    icon: 'food-steak' as const },
  { key: 'Boulangerie',  label: 'Boulangerie',  icon: 'bread-slice' as const },
  { key: 'Supermarché',  label: 'Supermarché',  icon: 'cart-outline' as const },
  { key: 'Traiteur',     label: 'Traiteur',     icon: 'food-variant' as const },
  { key: 'Épicerie',     label: 'Épicerie',     icon: 'storefront-outline' as const },
  { key: 'Restaurant',   label: 'Restaurant',   icon: 'silverware-fork-knife' as const },
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
       commerces (id, name, address, city, postal_code, logo_url, photos, hashgakha, commerce_type, latitude, longitude)`,
    )
    .eq('status', 'published')
    .eq('day', day)
    .order('created_at', { ascending: false })
    .limit(40);

  if (error) throw error;
  const real = (data ?? []) as unknown as Basket[];
  return real;
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
  const trackRef = useRef<View>(null);
  // Store both the screen X and the screen-space width from measureInWindow
  const trackScreenRef = useRef({ x: 0, w: 0 });
  const min = 1, max = 20;
  const pct = (value - min) / (max - min);
  const filledWidth = trackWidth * pct;
  const knobLeft = trackWidth * pct - 11;

  // Measure the track's absolute position AND width on screen
  const measureTrack = useCallback(() => {
    trackRef.current?.measureInWindow((x, _y, w) => {
      if (x != null && !isNaN(x) && w != null && !isNaN(w) && w > 0) {
        trackScreenRef.current = { x, w };
      }
    });
  }, []);

  // Convert a page-level X coordinate into a slider value
  const updateFromPageX = useCallback(
    (pageX: number) => {
      const { x: screenX, w: screenW } = trackScreenRef.current;
      if (!screenW) return;
      const localX = pageX - screenX;
      const ratio = Math.max(0, Math.min(1, localX / screenW));
      onChange(Math.round(min + ratio * (max - min)));
    },
    [onChange],
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => updateFromPageX(e.nativeEvent.pageX),
      onPanResponderMove: (e) => updateFromPageX(e.nativeEvent.pageX),
    }),
  ).current;

  // Re-create panResponder when dependencies change
  useEffect(() => {
    panResponder.panHandlers = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => updateFromPageX(e.nativeEvent.pageX),
      onPanResponderMove: (e) => updateFromPageX(e.nativeEvent.pageX),
    }).panHandlers;
  }, [updateFromPageX]);

  return (
    <View>
      <View
        ref={trackRef}
        onLayout={(e) => {
          setTrackWidth(e.nativeEvent.layout.width);
          // Delay measure so layout is committed (gets screen-space coords)
          setTimeout(measureTrack, 100);
        }}
        style={styles.sliderTrackOuter}
        {...panResponder.panHandlers}
      >
        <View style={styles.sliderTrackBg} />
        {trackWidth > 0 && (
          <>
            <View style={[styles.sliderTrackFill, { width: filledWidth }]} />
            <View style={[styles.sliderKnob, { left: knobLeft }]} />
          </>
        )}
      </View>
      <View style={styles.sliderLabelRow}>
        <Text style={styles.sliderLabel}>1 km</Text>
        <Text style={styles.sliderLabel}>20 km</Text>
      </View>
    </View>
  );
}

// Distance haversine en km entre 2 coords lat/lng
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AccueilPage() {
  const { userLocation, setUserLocation } = useAppStore();
  const location = userLocation?.cityName ?? null;
  // userCoords vaut null si lat/lng = 0 (state intermédiaire) → pas de filtre distance
  const userCoords =
    userLocation && (userLocation.lat !== 0 || userLocation.lng !== 0)
      ? { lat: userLocation.lat, lng: userLocation.lng }
      : null;
  const [showPostalModal, setShowPostalModal] = useState(false);
  const [postalInput, setPostalInput] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('now');
  const [selectedCategories, setSelectedCategories] = useState<BasketType[]>([]);
  const [showFilter, setShowFilter] = useState(false);
  const [distance, setDistance] = useState(5);
  const [selectedCommerceTypes, setSelectedCommerceTypes] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const filterAnim = useRef(new Animated.Value(0)).current;

  // Track home view
  useEffect(() => {
    trackEvent(MixpanelEvents.VIEW_HOME);
  }, []);

  const day = timeFilter === 'tomorrow' ? 'tomorrow' : 'today';

  const { data: baskets = [], isLoading, refetch } = useQuery({
    queryKey: ['baskets-home', day],
    queryFn: () => fetchBaskets(day),
  });

  // Resolve postal code to city name + coords via API
  const resolvePostalCode = useCallback(async (code: string) => {
    try {
      const res = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${code}&fields=nom,centre&limit=1`);
      const data = await res.json();
      if (data?.[0]?.nom) {
        const cityName = data[0].nom;
        // Centre est un GeoJSON Point: { type: 'Point', coordinates: [lng, lat] }
        const centre = data[0].centre;
        if (centre?.coordinates && Array.isArray(centre.coordinates)) {
          const [lng, lat] = centre.coordinates;
          if (typeof lat === 'number' && typeof lng === 'number') {
            setUserLocation({ lat, lng, cityName });
            return;
          }
        }
        setUserLocation({ lat: 0, lng: 0, cityName });
      } else {
        setUserLocation({ lat: 0, lng: 0, cityName: code });
      }
    } catch {
      setUserLocation({ lat: 0, lng: 0, cityName: code });
    }
  }, [setUserLocation]);

  const handlePostalSubmit = useCallback(() => {
    const code = postalInput.trim();
    if (/^\d{5}$/.test(code)) {
      setShowPostalModal(false);
      resolvePostalCode(code);
    }
  }, [postalInput, resolvePostalCode]);

  // Geo: get city name or ask for postal code (skip si déjà défini par l'user)
  useEffect(() => {
    if (userLocation) return; // ne pas écraser un choix manuel
    if (Platform.OS === 'web') {
      setUserLocation({ lat: 48.8566, lng: 2.3522, cityName: 'Paris' });
      return;
    }
    (async () => {
      try {
        const Location = require('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setShowPostalModal(true);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const [addr] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        setUserLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          cityName: addr?.city ?? null,
        });
      } catch {
        setShowPostalModal(true);
      }
    })();
  }, [userLocation, setUserLocation]);

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
    outputRange: [0, 380],
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Filter baskets by category + commerce type + distance (si user position connue)
  const displayed = (baskets ?? []).filter((b) => {
    if (!b) return false;
    const hasStock = (b.quantity_total ?? 0) - (b.quantity_reserved ?? 0) - (b.quantity_sold ?? 0) > 0;
    const matchCat = selectedCategories.length === 0 || selectedCategories.includes(b.type);
    const matchCommerceType = selectedCommerceTypes.length === 0 || selectedCommerceTypes.includes(b.commerces?.commerce_type ?? '');

    // Filtre distance — appliqué uniquement si on a la position user ET les coords du commerce
    let matchDistance = true;
    if (userCoords && b.commerces?.latitude != null && b.commerces?.longitude != null) {
      const km = haversineKm(
        userCoords.lat,
        userCoords.lng,
        b.commerces.latitude,
        b.commerces.longitude,
      );
      matchDistance = km <= distance;
    }

    return hasStock && matchCat && matchCommerceType && matchDistance;
  });

  const TIME_TABS: { key: TimeFilter; label: string }[] = [
    { key: 'now',      label: "Maintenant" },
    { key: 'today',    label: "Aujourd'hui" },
    { key: 'tomorrow', label: 'Demain' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      {/* ── Branded App Header ── */}
      <View style={styles.header}>
        {/* Logo + share */}
        <View style={styles.headerBrandRow}>
          <Image
            source={require('@/assets/logo-k.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.headerBrandShare}>share</Text>
        </View>

        {/* Location + Notification bell */}
        <View style={styles.headerRightRow}>
          <TouchableOpacity
            style={styles.headerLocationRow}
            onPress={() => setShowPostalModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="location" size={13} color="#3744C8" />
            <Text style={styles.headerLocation} numberOfLines={1}>
              {location ?? 'Localisation…'}
            </Text>
            <Ionicons name="chevron-down" size={12} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.notifBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color="#374151" />
            <View style={styles.notifDot} accessible={false} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Postal Code Modal ── */}
      <Modal
        visible={showPostalModal}
        transparent
        animationType="fade"
        onRequestClose={() => { if (location) setShowPostalModal(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {location && (
              <TouchableOpacity
                style={styles.modalBackBtn}
                onPress={() => setShowPostalModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={22} color="#374151" />
              </TouchableOpacity>
            )}
            <Ionicons name="location-outline" size={40} color="#3744C8" style={{ alignSelf: 'center', marginBottom: 8 }} />
            <Text style={styles.modalTitle}>Votre localisation</Text>
            <Text style={styles.modalSubtitle}>
              Entrez votre code postal pour afficher les commerces proches de chez vous
            </Text>
            <TextInput
              style={styles.modalInput}
              value={postalInput}
              onChangeText={(t) => setPostalInput(t.replace(/[^0-9]/g, '').slice(0, 5))}
              placeholder="Ex : 75019"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={5}
              autoFocus
              onSubmitEditing={handlePostalSubmit}
            />
            <TouchableOpacity
              style={[styles.modalBtn, postalInput.length !== 5 && styles.modalBtnDisabled]}
              onPress={handlePostalSubmit}
              disabled={postalInput.length !== 5}
              activeOpacity={0.85}
            >
              <Text style={styles.modalBtnText}>Valider</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Catégories + Time filter (fixed, not scrollable) ── */}
      <View style={styles.fixedFilterSection}>
        {/* Category chips */}
        <View style={styles.catChipRow}>
          {CATEGORIES.map((cat) => {
            const active = selectedCategories.includes(cat.type as BasketType);
            const hasSelection = selectedCategories.length > 0;
            const dimmed = hasSelection && !active;
            return (
              <TouchableOpacity
                key={cat.type}
                style={[
                  styles.catChip,
                  active && { backgroundColor: cat.bg, borderColor: cat.bg },
                  dimmed && styles.catChipDimmed,
                ]}
                onPress={() =>
                  setSelectedCategories((prev) =>
                    prev.includes(cat.type as BasketType)
                      ? prev.filter((c) => c !== cat.type)
                      : [...prev, cat.type as BasketType]
                  )
                }
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.catChipText,
                    { color: cat.bg },
                    active && styles.catChipTextActive,
                    dimmed && styles.catChipTextDimmed,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Time filter row ── */}
        <View style={styles.timeRow}>
          {TIME_TABS.map((t) => {
            const active = timeFilter === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setTimeFilter(t.key)}
                activeOpacity={0.8}
                style={active ? styles.timePillGradientWrap : styles.timePill}
              >
                {active ? (
                  <LinearGradient
                    colors={['#1e2a78', '#2d4de0', '#4f6df5']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.timePillGradient}
                  >
                    <Text style={styles.timePillTextActive}>{t.label}</Text>
                  </LinearGradient>
                ) : (
                  <Text style={styles.timePillText}>{t.label}</Text>
                )}
              </TouchableOpacity>
            );
          })}
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
          {/* Commerce type filter */}
          <Text style={styles.filterRowLabel}>Type de commerce</Text>
          <View style={styles.commerceTypeRow}>
            {COMMERCE_TYPES.map((ct) => {
              const selected = selectedCommerceTypes.includes(ct.key);
              return (
                <TouchableOpacity
                  key={ct.key}
                  style={[styles.commerceTypeChip, selected && styles.commerceTypeChipActive]}
                  onPress={() =>
                    setSelectedCommerceTypes((prev) =>
                      prev.includes(ct.key)
                        ? prev.filter((k) => k !== ct.key)
                        : [...prev, ct.key]
                    )
                  }
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={ct.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                    size={16}
                    color={selected ? '#fff' : '#6B7280'}
                  />
                  <Text style={[styles.commerceTypeText, selected && styles.commerceTypeTextActive]}>
                    {ct.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Distance filter */}
          <View style={styles.filterRow}>
            <Text style={styles.filterRowLabel}>Distance maximale</Text>
            <Text style={styles.filterRowValue}>{distance} km</Text>
          </View>
          <DistanceSlider value={distance} onChange={setDistance} />
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={() => setShowFilter(false)}
            accessibilityRole="button"
            accessibilityLabel="Appliquer les filtres"
          >
            <Text style={styles.applyBtnText}>Appliquer les filtres</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── Scrollable content ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: '#F8F9FC' }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3744C8" />
        }
      >
        {/* ── Section header ── */}
        <View style={styles.availRow}>
          <Text style={styles.availLabel}>
            {timeFilter === 'tomorrow' ? 'DISPONIBLE DEMAIN' : timeFilter === 'today' ? "DISPONIBLE AUJOURD'HUI" : 'DISPONIBLE MAINTENANT'}
          </Text>
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
              <CommerceCard key={b.id} basket={b} />
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
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // ── Branded header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    ...Platform.select({
      ios: {
        shadowColor: '#1e293b',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogo: {
    width: 38,
    height: 38,
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerBrandShare: {
    fontSize: 21,
    fontWeight: '800',
    color: '#3744C8',
    letterSpacing: -0.3,
    marginLeft: -4,
    marginTop: 5,
  },
  headerLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8F9FC',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  headerLocation: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
    maxWidth: 120,
  },

  // ── Postal Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: '20%',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
    }),
  },
  modalBackBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 1,
    padding: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: 4,
    backgroundColor: '#F8F9FC',
    marginBottom: 16,
  },
  modalBtn: {
    backgroundColor: '#3744C8',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalBtnDisabled: {
    opacity: 0.4,
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalCloseBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalCloseBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8F9FC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#F8F9FC',
  },

  // Fixed filter section (categories + time)
  fixedFilterSection: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingTop: 12,
  },

  // Category chips
  catChipRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8F9FC',
  },
  catChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  catChipTextActive: {
    color: '#fff',
  },
  catChipDimmed: {
    opacity: 0.35,
  },
  catChipTextDimmed: {
    color: '#9CA3AF',
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
  timePillGradientWrap: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  timePillGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  timePillTextActive: {
    fontSize: 13,
    fontWeight: '600',
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
  commerceTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  commerceTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8F9FC',
  },
  commerceTypeChipActive: {
    backgroundColor: '#3744C8',
    borderColor: '#3744C8',
  },
  commerceTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  commerceTypeTextActive: {
    color: '#fff',
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
