import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { BasketCard } from '@/components/BasketCard';
import { SearchBar } from '@/components/SearchBar';
import { BASKET_TYPE_LABELS, type Basket, type BasketType } from '@/lib/types';

const ALL_TYPES = ['all', 'bassari', 'halavi', 'parve', 'shabbat', 'mix'] as const;
type FilterType = (typeof ALL_TYPES)[number];

async function fetchAllBaskets(): Promise<Basket[]> {
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
    .order('created_at', { ascending: false })
    .limit(60);

  if (error) throw error;
  return (data ?? []) as unknown as Basket[];
}

export default function RechercherPage() {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: baskets = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['baskets', 'all'],
    queryFn: fetchAllBaskets,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filteredBaskets = useMemo(() => {
    let filtered = baskets.filter(
      (b) => b.quantity_total - b.quantity_reserved - b.quantity_sold > 0,
    );

    if (selectedType !== 'all') {
      filtered = filtered.filter((b) => b.type === selectedType);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.commerces?.name.toLowerCase().includes(q) ||
          b.commerces?.city.toLowerCase().includes(q) ||
          BASKET_TYPE_LABELS[b.type].label.toLowerCase().includes(q),
      );
    }

    return filtered;
  }, [baskets, selectedType, search]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header fixe avec recherche et filtres */}
      <View style={styles.header}>
        <Text style={styles.title}>Rechercher</Text>
        <View style={styles.searchContainer}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Commerce, ville, type..."
          />
        </View>

        {/* Filtres par type */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          {ALL_TYPES.map((type) => {
            const isSelected = selectedType === type;
            const typeInfo = type !== 'all' ? BASKET_TYPE_LABELS[type as BasketType] : null;

            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterChip,
                  isSelected && {
                    backgroundColor: typeInfo?.color ?? '#3744C8',
                    borderColor: typeInfo?.color ?? '#3744C8',
                  },
                ]}
                onPress={() => setSelectedType(type)}
                activeOpacity={0.75}
              >
                {typeInfo && (
                  <Text style={styles.filterEmoji}>{typeInfo.emoji}</Text>
                )}
                <Text
                  style={[
                    styles.filterText,
                    isSelected && styles.filterTextActive,
                  ]}
                >
                  {type === 'all' ? 'Tous' : typeInfo?.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Resultats */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3744C8" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBaskets}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3744C8"
            />
          }
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <BasketCard basket={item} />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>
                {search || selectedType !== 'all' ? '🔍' : '🌙'}
              </Text>
              <Text style={styles.emptyTitle}>
                {search || selectedType !== 'all'
                  ? 'Aucun résultat'
                  : 'Pas de paniers disponibles'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {search || selectedType !== 'all'
                  ? 'Essayez avec d\'autres mots-clés ou filtres.'
                  : 'Aucun panier casher n\'est disponible pour le moment.'}
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
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  filterEmoji: {
    fontSize: 14,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  columnWrapper: {
    gap: 12,
    marginBottom: 12,
  },
  cardWrapper: {
    flex: 1,
  },
  emptyContainer: {
    paddingTop: 60,
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
