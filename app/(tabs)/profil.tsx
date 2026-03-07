import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import type { UserProfile } from '@/lib/types';

interface Stats {
  totalOrders: number;
  totalSaved: number;
  co2Saved: number; // kg, estimated ~2.5 kg CO2 per basket
}

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role, avatar_url, created_at')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data as UserProfile;
}

async function fetchStats(userId: string): Promise<Stats> {
  const { data, error } = await supabase
    .from('orders')
    .select('amount_paid, baskets(original_price)')
    .eq('user_id', userId)
    .eq('status', 'picked_up');

  if (error || !data) return { totalOrders: 0, totalSaved: 0, co2Saved: 0 };

  const totalOrders = data.length;
  const totalSaved = data.reduce((sum: number, o: { amount_paid: number; baskets: { original_price: number } | null }) => {
    const originalPrice = o.baskets?.original_price ?? 0;
    return sum + (originalPrice - o.amount_paid);
  }, 0);
  const co2Saved = totalOrders * 2.5;

  return { totalOrders, totalSaved, co2Saved };
}

function getInitials(profile: UserProfile | null): string {
  if (!profile) return '?';
  const first = profile.first_name?.[0] ?? '';
  const last = profile.last_name?.[0] ?? '';
  return (first + last).toUpperCase() || profile.email[0].toUpperCase();
}

function StatCard({
  emoji,
  value,
  label,
}: {
  emoji: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ProfilPage() {
  const { user, signOut } = useAppStore();
  const [signingOut, setSigningOut] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => (user?.id ? fetchProfile(user.id) : Promise.resolve(null)),
    enabled: !!user?.id,
  });

  const { data: stats } = useQuery({
    queryKey: ['stats', user?.id],
    queryFn: () => (user?.id ? fetchStats(user.id) : Promise.resolve({ totalOrders: 0, totalSaved: 0, co2Saved: 0 })),
    enabled: !!user?.id,
  });

  const handleSignOut = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            await signOut();
          },
        },
      ],
    );
  };

  const fullName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
    : null;

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header profil */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {profileLoading ? '...' : getInitials(profile ?? null)}
            </Text>
          </View>
          {fullName && <Text style={styles.fullName}>{fullName}</Text>}
          <Text style={styles.email}>{profile?.email ?? user?.email ?? ''}</Text>
          {memberSince && (
            <Text style={styles.memberSince}>Membre depuis {memberSince}</Text>
          )}
        </View>

        {/* Statistiques */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mes statistiques</Text>
          <View style={styles.statsGrid}>
            <StatCard
              emoji="🛍️"
              value={String(stats?.totalOrders ?? 0)}
              label="Paniers achetés"
            />
            <StatCard
              emoji="💰"
              value={`${(stats?.totalSaved ?? 0).toFixed(0)} €`}
              label="Économisés"
            />
            <StatCard
              emoji="🌿"
              value={`${(stats?.co2Saved ?? 0).toFixed(1)} kg`}
              label="CO₂ évité"
            />
          </View>
        </View>

        {/* Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mon compte</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
              <View style={styles.menuLeft}>
                <View style={[styles.menuIcon, { backgroundColor: '#eff6ff' }]}>
                  <Ionicons name="person-outline" size={18} color="#3b82f6" />
                </View>
                <Text style={styles.menuText}>Modifier mon profil</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
              <View style={styles.menuLeft}>
                <View style={[styles.menuIcon, { backgroundColor: '#f0fdf4' }]}>
                  <Ionicons name="notifications-outline" size={18} color="#22c55e" />
                </View>
                <Text style={styles.menuText}>Notifications</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
              <View style={styles.menuLeft}>
                <View style={[styles.menuIcon, { backgroundColor: '#fef2f2' }]}>
                  <Ionicons name="lock-closed-outline" size={18} color="#ef4444" />
                </View>
                <Text style={styles.menuText}>Sécurité</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
              <View style={styles.menuLeft}>
                <View style={[styles.menuIcon, { backgroundColor: '#f3f4f6' }]}>
                  <Ionicons name="document-text-outline" size={18} color="#6b7280" />
                </View>
                <Text style={styles.menuText}>Conditions Générales</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
              <View style={styles.menuLeft}>
                <View style={[styles.menuIcon, { backgroundColor: '#f3f4f6' }]}>
                  <Ionicons name="shield-outline" size={18} color="#6b7280" />
                </View>
                <Text style={styles.menuText}>Politique de confidentialité</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
              <View style={styles.menuLeft}>
                <View style={[styles.menuIcon, { backgroundColor: '#f3f4f6' }]}>
                  <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
                </View>
                <Text style={styles.menuText}>À propos</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Déconnexion */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.signOutButton, signingOut && styles.signOutButtonDisabled]}
            onPress={handleSignOut}
            disabled={signingOut}
            activeOpacity={0.85}
          >
            {signingOut ? (
              <ActivityIndicator color="#ef4444" size="small" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                <Text style={styles.signOutText}>Se déconnecter</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

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
  profileHeader: {
    backgroundColor: '#ffffff',
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  fullName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  email: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  memberSince: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 6,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statEmoji: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  statLabel: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginLeft: 62,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  signOutButtonDisabled: {
    opacity: 0.6,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },
});
