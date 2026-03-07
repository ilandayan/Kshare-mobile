import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { BasketCard } from '@/components/BasketCard';
import type { Basket } from '@/lib/types';

async function fetchBaskets(): Promise<Basket[]> {
  const { data, error } = await supabase
    .from('baskets')
    .select(
      `
      id, type, day, description,
      original_price, sold_price,
      quantity_total, quantity_reserved, quantity_sold,
      status, is_donation, pickup_start, pickup_end, created_at, commerce_id,
      commerces (id, name, address, city, postal_code, logo_url, hashgakha, latitude, longitude)
    `,
    )
    .eq('status', 'published')
    .eq('day', 'today')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw error;
  return (data ?? []) as Basket[];
}

export default function AccueilPage() {
  const { user } = useAppStore();
  const [userCity, setUserCity] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [firstName, setFirstName] = useState<string | null>(null);

  const {
    data: baskets = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['baskets', 'today'],
    queryFn: fetchBaskets,
  });

  useEffect(() => {
    if (user?.id) {
      supabase
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.first_name) setFirstName(data.first_name);
        });
    }
  }, [user?.id]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address?.city) setUserCity(address.city);
    })();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const todayBaskets = baskets.filter(
    (b) => b.quantity_total - b.quantity_reserved - b.quantity_sold > 0,
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Bonjour {firstName ? `${firstName} ` : ''}👋
            </Text>
            <Text style={styles.subGreeting}>
              {userCity
                ? `Paniers disponibles à ${userCity}`
                : 'Trouvez vos paniers casher'}
            </Text>
          </View>
          <View style={styles.logoSmall}>
            <Text style={styles.logoEmoji}>🛍️</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Chargement des paniers...</Text>
          </View>
        ) : todayBaskets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🌙</Text>
            <Text style={styles.emptyTitle}>Pas de paniers disponibles</Text>
            <Text style={styles.emptySubtitle}>
              Aucun panier casher n'est disponible pour le moment. Revenez plus tard !
            </Text>
          </View>
        ) : (
          <>
            {/* Paniers aujourd'hui */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Paniers disponibles aujourd'hui</Text>
              <Text style={styles.sectionSubtitle}>
                {todayBaskets.length} panier{todayBaskets.length > 1 ? 's' : ''} disponible{todayBaskets.length > 1 ? 's' : ''}
              </Text>
              <FlatList
                data={todayBaskets.slice(0, 10)}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
                renderItem={({ item }) => <BasketCard basket={item} />}
                ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              />
            </View>

            {/* Tous les paniers */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tous les paniers</Text>
              <View style={styles.verticalList}>
                {todayBaskets.map((basket) => (
                  <BasketCard key={basket.id} basket={basket} variant="horizontal" />
                ))}
              </View>
            </View>
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  subGreeting: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  logoSmall: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 22,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 20,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    paddingHorizontal: 20,
    marginTop: 2,
    marginBottom: 14,
  },
  horizontalList: {
    paddingHorizontal: 20,
  },
  verticalList: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 8,
  },
  loadingContainer: {
    paddingTop: 80,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 14,
  },
  emptyContainer: {
    paddingTop: 80,
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});
