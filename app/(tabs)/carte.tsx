import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Location from 'expo-location';

// react-native-maps only works on native (iOS/Android), not web
let MapView: any = null;
let Circle: any = null;
let Marker: any = null;
let Callout: any = null;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Circle = Maps.Circle;
  Marker = Maps.Marker;
  Callout = Maps.Callout;
}
const IS_NATIVE = Platform.OS !== 'web';
import { supabase } from '@/lib/supabase';
import { BASKET_TYPE_LABELS, type Basket } from '@/lib/types';
import { getCommerceImage } from '@/lib/commerceImages';

// ── Constants ────────────────────────────────────────────────────────────────
const RADIUS_OPTIONS = [1, 3, 5, 10, 20] as const;
const DEFAULT_LOCATION = { latitude: 48.8566, longitude: 2.3522 }; // Paris

function deltaForKm(km: number): number {
  // ~0.009 per km
  return km * 0.009 + 0.003;
}

const COMMERCE_TYPE_ICONS: Record<string, { icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  Boucherie:   { icon: 'food-steak' },
  Boulangerie: { icon: 'bread-slice' },
  Supermarché: { icon: 'cart-outline' },
  Traiteur:    { icon: 'food-variant' },
  Épicerie:    { icon: 'storefront-outline' },
  Restaurant:  { icon: 'silverware-fork-knife' },
};

const BADGE_CONFIG: Record<string, { bg: string; text: string }> = {
  bassari: { bg: '#D94452', text: '#fff' },
  halavi:  { bg: '#2E8BBE', text: '#fff' },
  parve:   { bg: '#2A9D6E', text: '#fff' },
  shabbat: { bg: '#D97B1A', text: '#fff' },
  mix:     { bg: '#7B5CC0', text: '#fff' },
};

// ── Haversine distance ───────────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Data fetching ────────────────────────────────────────────────────────────
async function fetchNearbyBaskets(): Promise<Basket[]> {
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
    .eq('day', 'today')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as unknown as Basket[];
}

function formatTime(value: string): string {
  if (/^\d{2}:\d{2}/.test(value)) {
    return value.slice(0, 5);
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ── List item ────────────────────────────────────────────────────────────────
function CommerceListItem({ basket, distance }: { basket: Basket; distance: number }) {
  const typeInfo = BASKET_TYPE_LABELS[basket.type];
  const badge = BADGE_CONFIG[basket.type] ?? { bg: '#6B7280', text: '#fff' };
  const commerce = basket.commerces;
  const commerceTypeInfo = COMMERCE_TYPE_ICONS[commerce?.commerce_type ?? ''] ?? { icon: 'storefront-outline' as const };

  return (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => router.push(`/panier/${basket.id}`)}
      activeOpacity={0.88}
    >
      {/* Thumbnail */}
      <View style={styles.thumbnail}>
        {(() => {
          const coverImage = getCommerceImage(commerce?.photos, commerce?.commerce_type);
          return coverImage ? (
            <Image source={coverImage} style={styles.thumbnailImg} resizeMode="cover" />
          ) : (
            <View style={[styles.thumbnailPlaceholder, { backgroundColor: typeInfo.bgColor }]}>
              <MaterialCommunityIcons name={commerceTypeInfo.icon} size={28} color="#9CA3AF" />
            </View>
          );
        })()}
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
          <Text style={styles.listMetaText}>
            {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}
          </Text>
          <Ionicons name="time-outline" size={11} color="#6B7280" style={{ marginLeft: 6 }} />
          <Text style={styles.listMetaText}>
            {formatTime(basket.pickup_start)} - {formatTime(basket.pickup_end)}
          </Text>
        </View>
        {/* Prices + discount */}
        <View style={styles.listPriceRow}>
          <Text style={styles.listOriginalPrice}>{basket.original_price.toFixed(2)}€</Text>
          <Text style={styles.listSoldPrice}>{basket.sold_price.toFixed(2)}€</Text>
          <View style={[styles.listDiscountBadge, { backgroundColor: badge.bg }]}>
            <Text style={styles.listDiscountText}>
              -{Math.round((1 - basket.sold_price / basket.original_price) * 100)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Right column: badge */}
      <View style={styles.listRight}>
        <View style={[styles.listBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.listBadgeText, { color: badge.text }]}>{typeInfo.label}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function CartePage() {
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number>(1);
  const mapRef = React.useRef<MapView>(null);

  // Request location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError(true);
        setUserLocation(DEFAULT_LOCATION);
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      } catch {
        setLocationError(true);
        setUserLocation(DEFAULT_LOCATION);
      }
    })();
  }, []);

  const { data: baskets = [], isLoading, refetch } = useQuery({
    queryKey: ['baskets-carte'],
    queryFn: fetchNearbyBaskets,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Filter available baskets within radius, sorted by distance
  const nearbyBaskets = useMemo(() => {
    if (!userLocation) return [];
    return baskets
      .filter((b) => {
        const remaining = b.quantity_total - b.quantity_reserved - b.quantity_sold;
        if (remaining <= 0) return false;
        const lat = b.commerces?.latitude;
        const lng = b.commerces?.longitude;
        if (lat == null || lng == null) return false;
        const dist = haversineKm(userLocation.latitude, userLocation.longitude, lat, lng);
        return dist <= radiusKm;
      })
      .map((b) => ({
        basket: b,
        distance: haversineKm(
          userLocation.latitude,
          userLocation.longitude,
          b.commerces!.latitude!,
          b.commerces!.longitude!,
        ),
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [baskets, userLocation, radiusKm]);

  // Group baskets by commerce for multi-color markers
  const commerceMarkers = useMemo(() => {
    const grouped = new Map<string, { commerce: Basket['commerces']; distance: number; types: Set<string>; firstBasketId: string }>();
    for (const { basket, distance } of nearbyBaskets) {
      const cid = basket.commerce_id;
      const existing = grouped.get(cid);
      if (existing) {
        existing.types.add(basket.type);
      } else {
        grouped.set(cid, {
          commerce: basket.commerces,
          distance,
          types: new Set([basket.type]),
          firstBasketId: basket.id,
        });
      }
    }
    return Array.from(grouped.values());
  }, [nearbyBaskets]);

  if (!userLocation) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3744C8" />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>Localisation en cours...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <StatusBar style="dark" />
      </SafeAreaView>

      {/* Map */}
      {IS_NATIVE && MapView ? (
        <MapView
          ref={mapRef}
          style={styles.mapContainer}
          initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: deltaForKm(radiusKm),
            longitudeDelta: deltaForKm(radiusKm),
          }}
          showsUserLocation
          showsMyLocationButton
        >
          {/* Radius circle */}
          <Circle
            center={userLocation}
            radius={radiusKm * 1000}
            fillColor="rgba(55, 68, 200, 0.07)"
            strokeColor="rgba(55, 68, 200, 0.25)"
            strokeWidth={1.5}
          />

          {/* Commerce markers */}
          {commerceMarkers.map(({ commerce, distance, types, firstBasketId }) => {
            const typeColors = Array.from(types).map((t) => BADGE_CONFIG[t]?.bg ?? '#3744C8');
            return (
              <Marker
                key={commerce!.id}
                coordinate={{ latitude: commerce!.latitude!, longitude: commerce!.longitude! }}
              >
                {/* Custom multi-color marker */}
                <View style={styles.markerContainer}>
                  <View style={styles.markerPin}>
                    <View style={styles.markerDots}>
                      {typeColors.map((color, i) => (
                        <View key={i} style={[styles.markerDot, { backgroundColor: color }]} />
                      ))}
                    </View>
                  </View>
                  <View style={styles.markerArrow} />
                </View>
                <Callout onPress={() => router.push(`/panier/${firstBasketId}`)}>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle}>{commerce!.name}</Text>
                    <Text style={styles.calloutSub}>
                      {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}
                      {' · '}
                      {types.size} panier{types.size > 1 ? 's' : ''}
                    </Text>
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapView>
      ) : (
        <View style={[styles.mapContainer, styles.webMapFallback]}>
          <Ionicons name="map-outline" size={48} color="#9CA3AF" />
          <Text style={{ color: '#6B7280', marginTop: 8, fontSize: 14 }}>
            Carte disponible sur l'app mobile
          </Text>
          <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>
            {nearbyBaskets.length} commerce{nearbyBaskets.length > 1 ? 's' : ''} dans un rayon de {radiusKm} km
          </Text>
        </View>
      )}

      {/* Radius selector */}
      <View style={styles.radiusSelector}>
        {RADIUS_OPTIONS.map((km) => (
          <TouchableOpacity
            key={km}
            style={[styles.radiusBtn, radiusKm === km && styles.radiusBtnActive]}
            onPress={() => {
              setRadiusKm(km);
              mapRef.current?.animateToRegion({
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: deltaForKm(km),
                longitudeDelta: deltaForKm(km),
              }, 400);
            }}
          >
            <Text style={[styles.radiusBtnText, radiusKm === km && styles.radiusBtnTextActive]}>
              {km} km
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bottom sheet */}
      <View style={styles.sheet}>
        <View style={styles.dragHandle} />
        <Text style={styles.sheetTitle}>
          Commerces à proximité
          <Text style={styles.sheetSubtitle}> ({radiusKm} km)</Text>
        </Text>

        {locationError && (
          <View style={styles.locationWarning}>
            <Ionicons name="warning-outline" size={14} color="#D97706" />
            <Text style={styles.locationWarningText}>
              Localisation non disponible — position par défaut (Paris)
            </Text>
          </View>
        )}

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
            {nearbyBaskets.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="location-outline" size={32} color="#D1D5DB" />
                <Text style={styles.emptyText}>Aucun commerce dans un rayon de {radiusKm} km</Text>
              </View>
            ) : (
              nearbyBaskets.map(({ basket, distance }, i) => (
                <React.Fragment key={basket.id}>
                  <CommerceListItem basket={basket} distance={distance} />
                  {i < nearbyBaskets.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))
            )}
            <View style={{ height: 20 }} />
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  safeTop: {
    backgroundColor: '#ffffff',
  },

  // Map
  mapContainer: {
    height: '42%',
  },
  webMapFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },

  // Radius selector
  radiusSelector: {
    position: 'absolute',
    top: '42%',
    left: 12,
    flexDirection: 'row',
    gap: 6,
    zIndex: 10,
  },
  radiusBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 52,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3 },
      android: { elevation: 3 },
    }),
  },
  radiusBtnActive: {
    backgroundColor: '#3744C8',
  },
  radiusBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  radiusBtnTextActive: {
    color: '#ffffff',
  },

  // Custom marker
  markerContainer: {
    alignItems: 'center',
  },
  markerPin: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  markerDots: {
    flexDirection: 'row',
    gap: 3,
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#ffffff',
    marginTop: -1,
  },

  // Callout
  callout: {
    minWidth: 120,
    padding: 4,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  calloutSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
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
  sheetSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#9CA3AF',
  },
  sheetContent: {
    paddingHorizontal: 20,
  },
  locationWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  locationWarningText: {
    fontSize: 12,
    color: '#D97706',
  },
  loader: {
    paddingTop: 40,
    alignItems: 'center',
  },
  empty: {
    paddingTop: 40,
    alignItems: 'center',
    gap: 8,
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
    color: '#3744C8',
  },
  listRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    flexShrink: 0,
    gap: 6,
  },
  listBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
  },
  listBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listDiscountBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  listDiscountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 78,
  },
});
