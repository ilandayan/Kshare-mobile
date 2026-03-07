import React from 'react';
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
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { BasketTypeBadge } from '@/components/BasketTypeBadge';
import { BASKET_TYPE_LABELS, type Order } from '@/lib/types';

async function fetchOrder(id: string): Promise<Order | null> {
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
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Order;
}

const STATUS_INFO = {
  pending: { label: 'En attente de confirmation', color: '#f59e0b', icon: 'time-outline' as const },
  confirmed: { label: 'Commande confirmée', color: '#3b82f6', icon: 'checkmark-circle-outline' as const },
  picked_up: { label: 'Panier récupéré', color: '#22c55e', icon: 'checkmark-done-circle-outline' as const },
  cancelled: { label: 'Commande annulée', color: '#ef4444', icon: 'close-circle-outline' as const },
  refunded: { label: 'Remboursée', color: '#6b7280', icon: 'refresh-circle-outline' as const },
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

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrder(id),
    enabled: !!id,
    refetchInterval: 10000, // Rafraichir toutes les 10s
  });

  const handleOpenMaps = () => {
    if (!order?.baskets?.commerces) return;

    const address = `${order.baskets.commerces.address}, ${order.baskets.commerces.postal_code ?? ''} ${order.baskets.commerces.city}`;
    const encodedAddress = encodeURIComponent(address);

    const url = Platform.OS === 'ios'
      ? `maps:?q=${encodedAddress}`
      : `geo:0,0?q=${encodedAddress}`;

    Linking.canOpenURL(url).then((canOpen) => {
      if (canOpen) {
        Linking.openURL(url);
      } else {
        Linking.openURL(
          `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
        );
      }
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
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

        {/* QR Code section */}
        {order.status !== 'cancelled' && order.status !== 'refunded' && (
          <View style={styles.qrSection}>
            <Text style={styles.qrTitle}>QR Code de retrait</Text>
            <Text style={styles.qrSubtitle}>
              Présentez ce QR code au commerçant lors du retrait
            </Text>
            <QRCodeDisplay
              value={qrValue}
              size={200}
              label={order.qr_code_token ?? undefined}
            />
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
                <Ionicons name="business-outline" size={18} color="#3b82f6" />
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
                <Ionicons name="calendar-outline" size={18} color="#3b82f6" />
              </View>
              <View>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{dayLabel}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="time-outline" size={18} color="#3b82f6" />
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

        {/* Bouton itinéraire */}
        {order.baskets?.commerces && (
          <TouchableOpacity
            style={styles.mapsButton}
            onPress={handleOpenMaps}
            activeOpacity={0.85}
          >
            <Ionicons name="navigate-outline" size={20} color="#3b82f6" />
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
    backgroundColor: '#f9fafb',
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
  scrollContent: {
    padding: 20,
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
    color: '#3b82f6',
  },
});
