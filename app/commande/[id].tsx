import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { SwipeConfirmButton } from '@/components/SwipeConfirmButton';
import { BasketTypeBadge } from '@/components/BasketTypeBadge';
import { BASKET_TYPE_LABELS, type Order } from '@/lib/types';
import { isMockOrderId, getMockOrderById } from '@/lib/mockOrders';

async function fetchOrder(id: string): Promise<Order | null> {
  // Mock orders: return local data without hitting Supabase
  if (isMockOrderId(id)) {
    return getMockOrderById(id) ?? null;
  }

  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      id, basket_id, user_id, amount_paid, status, is_donation, qr_code_token, created_at,
      baskets (
        type, pickup_start, pickup_end, description,
        commerces (name, address, city, postal_code)
      ),
      associations (name)
    `,
    )
    .eq('id', id)
    .single();

  if (error) return null;
  return data as unknown as Order;
}

const STATUS_INFO: Record<string, { label: string; color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  created: { label: 'En attente de paiement', color: '#f59e0b', icon: 'time-outline' },
  paid: { label: 'Commande confirmée', color: '#3744C8', icon: 'checkmark-circle-outline' },
  ready_for_pickup: { label: 'Prêt à retirer', color: '#2563eb', icon: 'bag-check-outline' },
  picked_up: { label: 'Panier récupéré', color: '#22c55e', icon: 'checkmark-done-circle-outline' },
  no_show: { label: 'Non récupéré', color: '#ef4444', icon: 'alert-circle-outline' },
  refunded: { label: 'Remboursée', color: '#6b7280', icon: 'refresh-circle-outline' },
  cancelled_admin: { label: 'Commande annulée', color: '#ef4444', icon: 'close-circle-outline' },
};

function formatDateTime(isoString: string) {
  const date = new Date(isoString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let dayLabel = '';
  if (date.toDateString() === today.toDateString()) {
    dayLabel = "Aujourd'hui";
  } else if (date.toDateString() === tomorrow.toDateString()) {
    dayLabel = 'Demain';
  } else {
    dayLabel = date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    dayLabel = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1);
  }

  const timeStart = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return { dayLabel, timeStart };
}

export default function CommandePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [pickupConfirmed, setPickupConfirmed] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrder(id),
    enabled: !!id,
    refetchInterval: pickupConfirmed ? false : 10000,
  });

  const handleConfirmPickup = async () => {
    if (!order) return;
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'picked_up',
        picked_up_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (error) {
      Alert.alert('Erreur', 'Impossible de confirmer le retrait.');
      throw error;
    }

    setPickupConfirmed(true);
    queryClient.invalidateQueries({ queryKey: ['order', id] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const handleOpenMaps = async () => {
    if (!order?.baskets?.commerces) return;

    const commerce = order.baskets.commerces;
    const address = `${commerce.address}, ${commerce.postal_code ?? ''} ${commerce.city}`;
    const encodedAddress = encodeURIComponent(address);

    // Build available map app options
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    const wazeUrl = `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;

    if (Platform.OS === 'web') {
      Linking.openURL(googleMapsUrl);
      return;
    }

    type MapOption = { name: string; url: string };
    const options: MapOption[] = [];

    // Waze
    const canWaze = await Linking.canOpenURL('waze://');
    if (canWaze) options.push({ name: 'Waze', url: wazeUrl });

    // Google Maps
    const canGoogleMaps = await Linking.canOpenURL('comgooglemaps://');
    if (canGoogleMaps) {
      options.push({
        name: 'Google Maps',
        url: `comgooglemaps://?q=${encodedAddress}`,
      });
    }

    // Apple Plans (iOS only)
    if (Platform.OS === 'ios') {
      options.push({ name: 'Plans Apple', url: `maps:?q=${encodedAddress}` });
    }

    // Android default maps (geo: scheme)
    if (Platform.OS === 'android' && !canGoogleMaps) {
      options.push({ name: 'Maps', url: `geo:0,0?q=${encodedAddress}` });
    }

    // Fallback: Google Maps web
    if (options.length === 0) {
      Linking.openURL(googleMapsUrl);
      return;
    }

    // Only one option: open directly
    if (options.length === 1) {
      Linking.openURL(options[0].url);
      return;
    }

    // Multiple options: show picker
    Alert.alert(
      'Ouvrir avec',
      'Choisissez votre application GPS',
      [
        ...options.map((opt) => ({
          text: opt.name,
          onPress: () => Linking.openURL(opt.url),
        })),
        { text: 'Annuler', style: 'cancel' as const },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3744C8" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Commande introuvable.</Text>
      </View>
    );
  }

  const isMock = isMockOrderId(id);
  const typeInfo = order.baskets?.type ? BASKET_TYPE_LABELS[order.baskets.type] : null;
  const statusInfo = STATUS_INFO[order.status];
  const { dayLabel, timeStart } = order.baskets?.pickup_start
    ? formatDateTime(order.baskets.pickup_start)
    : { dayLabel: '', timeStart: '' };

  const pickupEnd = order.baskets?.pickup_end
    ? new Date(order.baskets.pickup_end).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const qrValue = order.qr_code_token ?? order.id;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Demo banner */}
        {isMock && (
          <View style={styles.demoBanner}>
            <Text style={styles.demoBannerText}>Données de démonstration</Text>
          </View>
        )}

        {/* Status banner */}
        <View
          style={[
            styles.statusBanner,
            { backgroundColor: statusInfo.color + '15', borderColor: statusInfo.color + '30' },
          ]}
        >
          <Ionicons name={statusInfo.icon} size={22} color={statusInfo.color} />
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>

        {/* QR Code section + swipe confirm */}
        {order.status !== 'cancelled_admin' && order.status !== 'refunded' && order.status !== 'no_show' && !pickupConfirmed && order.status !== 'picked_up' && (
          <View style={styles.qrSection}>
            <Text style={styles.qrTitle}>QR Code de retrait</Text>
            <Text style={styles.qrSubtitle}>
              {isMock
                ? 'Aperçu démo — le QR code sera fonctionnel avec une vraie commande'
                : 'Présentez ce QR code au commerçant puis glissez pour confirmer'}
            </Text>
            <QRCodeDisplay
              value={qrValue}
              size={200}
              label={order.qr_code_token ?? undefined}
            />
            {order.status === 'ready_for_pickup' && (
              <>
                <View style={styles.swipeContainer}>
                  <SwipeConfirmButton onConfirm={handleConfirmPickup} />
                </View>
                <TouchableOpacity
                  style={styles.helpBtn}
                  onPress={() => router.push(`/commande/signaler?orderId=${order.id}`)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="help-circle-outline" size={18} color="#EF4444" />
                  <Text style={styles.helpBtnText}>Commerce fermé ? Signaler</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Confirmation retrait */}
        {(pickupConfirmed || order.status === 'picked_up') && (
          <View style={styles.confirmedSection}>
            <View style={styles.confirmedCircle}>
              <Ionicons name="checkmark" size={48} color="#fff" />
            </View>
            <Text style={styles.confirmedTitle}>Retrait confirmé !</Text>
            <Text style={styles.confirmedSubtitle}>
              {order.is_donation ? 'Merci pour votre don' : 'Merci pour votre achat anti-gaspi'}
            </Text>
            <TouchableOpacity
              style={styles.backToPaniersBtn}
              onPress={() => router.push('/(tabs)/paniers')}
              activeOpacity={0.8}
            >
              <Text style={styles.backToPaniersText}>Retour à mes paniers</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Détail commande */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Détail de la commande</Text>
          <View style={styles.detailCard}>
            {typeInfo && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type de panier</Text>
                <BasketTypeBadge type={order.baskets!.type} size="sm" />
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Montant payé</Text>
              <Text style={styles.detailValue}>{order.amount_paid.toFixed(2)} €</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>N° de commande</Text>
              <Text style={[styles.detailValue, styles.monoText]}>
                {order.id.slice(0, 8).toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Infos retrait */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations de retrait</Text>
          <View style={styles.detailCard}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="business-outline" size={18} color="#3744C8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Commerce</Text>
                <Text style={styles.detailValue}>
                  {order.baskets?.commerces?.name ?? '—'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="calendar-outline" size={18} color="#3744C8" />
              </View>
              <View>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{dayLabel}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="time-outline" size={18} color="#3744C8" />
              </View>
              <View>
                <Text style={styles.detailLabel}>Créneau</Text>
                <Text style={styles.detailValue}>
                  {timeStart} – {pickupEnd}
                </Text>
              </View>
            </View>

            {order.baskets?.commerces && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <View style={[styles.infoIcon, { backgroundColor: '#f0fdf4' }]}>
                    <Ionicons name="location-outline" size={18} color="#22c55e" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>Adresse</Text>
                    <Text style={styles.detailValue}>
                      {order.baskets.commerces.address}{'\n'}
                      {order.baskets.commerces.postal_code} {order.baskets.commerces.city}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Association bénéficiaire (dons) */}
        {order.is_donation && order.associations?.name && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Don</Text>
            <View style={styles.detailCard}>
              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: '#faf5ff' }]}>
                  <Ionicons name="heart-outline" size={18} color="#9333EA" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>Association bénéficiaire</Text>
                  <Text style={[styles.detailValue, { color: '#9333EA' }]}>
                    {order.associations.name}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Bouton itinéraire */}
        {order.baskets?.commerces && (
          <TouchableOpacity
            style={styles.mapsButton}
            onPress={handleOpenMaps}
            activeOpacity={0.85}
          >
            <Ionicons name="navigate-outline" size={20} color="#3744C8" />
            <Text style={styles.mapsButtonText}>Voir l'itinéraire</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
  },
  demoBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  demoBannerText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 0,
    gap: 20,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '700',
  },
  qrSection: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  qrSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  detailLabel: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    lineHeight: 20,
  },
  monoText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginLeft: 16,
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
  },
  mapsButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3744C8',
  },
  swipeContainer: {
    width: '100%',
    marginTop: 8,
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
  },
  helpBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  confirmedSection: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  confirmedCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  confirmedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  confirmedSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  backToPaniersBtn: {
    backgroundColor: '#3744C8',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  backToPaniersText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
