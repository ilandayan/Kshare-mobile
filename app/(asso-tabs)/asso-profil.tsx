import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';

interface AssoProfile {
  name: string;
  city: string | null;
  department: string | null;
  status: string;
  contact: string | null;
}

async function fetchAssoProfile(userId: string): Promise<AssoProfile | null> {
  const { data } = await supabase
    .from('associations')
    .select('name, city, department, status, contact')
    .eq('profile_id', userId)
    .single();
  return data;
}

export default function AssoProfilScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAppStore();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['asso-profile', user?.id],
    queryFn: () => fetchAssoProfile(user!.id),
    enabled: !!user,
  });

  const handleSignOut = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: signOut },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#2a9d6e" />
      </View>
    );
  }

  const initials = (profile?.name ?? 'A')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{profile?.name ?? 'Association'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                profile?.status === 'validated' ? '#DCFCE7' : '#FEF3C7',
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color:
                  profile?.status === 'validated' ? '#16A34A' : '#D97706',
              },
            ]}
          >
            {profile?.status === 'validated' ? 'Validée' : 'En attente'}
          </Text>
        </View>
      </View>

      {/* Info cards */}
      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={20} color="#6B7280" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Ville</Text>
            <Text style={styles.infoValue}>{profile?.city ?? '—'}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Ionicons name="map-outline" size={20} color="#6B7280" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Département</Text>
            <Text style={styles.infoValue}>{profile?.department ?? '—'}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={20} color="#6B7280" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Contact</Text>
            <Text style={styles.infoValue}>{profile?.contact ?? '—'}</Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.signOutText}>Déconnexion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  content: { paddingBottom: 40 },

  avatarSection: { alignItems: 'center', paddingTop: 32, paddingBottom: 24 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2a9d6e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  name: { fontSize: 22, fontWeight: '800', color: '#111827' },
  email: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  statusBadge: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 13, fontWeight: '700' },

  infoSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  infoContent: { marginLeft: 12, flex: 1 },
  infoLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  infoValue: { fontSize: 15, color: '#111827', fontWeight: '500', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F3F4F6' },

  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    marginHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
  },
  signOutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
});
