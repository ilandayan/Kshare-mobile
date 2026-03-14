import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Platform,
  Share,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { LinearGradient } from 'expo-linear-gradient';
import type { UserProfile } from '@/lib/types';

// ── Fetch ─────────────────────────────────────────────────────────────────────
async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, role, avatar_url, created_at')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data as UserProfile;
}

function getInitials(profile: UserProfile | null, email: string | undefined): string {
  if (!profile) return (email?.[0] ?? '?').toUpperCase();
  const name = profile.full_name ?? '';
  const parts = name.trim().split(/\s+/);
  const initials = parts.map((p) => p[0]).join('').toUpperCase();
  return initials || (profile.email?.[0] ?? '?').toUpperCase();
}

// ── Row components ─────────────────────────────────────────────────────────────
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function ProfileRow({
  icon,
  label,
  value,
  onPress,
  last = false,
}: {
  icon: IoniconName;
  label: string;
  value?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <>
      <TouchableOpacity
        style={styles.row}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <View style={styles.rowLeft}>
          <View style={styles.rowIconWrap}>
            <Ionicons name={icon} size={18} color="#6B7280" />
          </View>
          <View style={styles.rowContent}>
            <Text style={styles.rowLabel}>{label}</Text>
            {value !== undefined && (
              <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
            )}
          </View>
        </View>
        {onPress && (
          <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
        )}
      </TouchableOpacity>
      {!last && <View style={styles.rowDivider} />}
    </>
  );
}

function ToggleRow({
  icon,
  label,
  value,
  onChange,
  last = false,
}: {
  icon: IoniconName;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <>
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <View style={styles.rowIconWrap}>
            <Ionicons name={icon} size={18} color="#6B7280" />
          </View>
          <Text style={[styles.rowLabel, { marginLeft: 0 }]}>{label}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ false: '#D1D5DB', true: '#111827' }}
          thumbColor={Platform.OS === 'ios' ? undefined : '#fff'}
          ios_backgroundColor="#D1D5DB"
        />
      </View>
      {!last && <View style={styles.rowDivider} />}
    </>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ProfilPage() {
  const { user, signOut } = useAppStore();
  const [signingOut, setSigningOut] = useState(false);
  const [notifEmail, setNotifEmail] = useState(false);
  const [notifPush, setNotifPush] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => (user?.id ? fetchProfile(user.id) : Promise.resolve(null)),
    enabled: !!user?.id,
  });

  const fullName = profile?.full_name ?? '';
  const email = profile?.email ?? user?.email ?? '';
  const initials = getInitials(profile ?? null, user?.email);

  const handleSignOut = () => {
    setShowLogoutModal(true);
  };

  const confirmSignOut = async () => {
    setShowLogoutModal(false);
    setSigningOut(true);
    await signOut();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Avatar + name ── */}
        <LinearGradient
          colors={['#1e2a78', '#2d4de0', '#4f6df5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileHeader}
        >
          <View style={styles.avatarCircle}>
            {isLoading ? (
              <ActivityIndicator color="#3744C8" />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{fullName || email}</Text>
            <Text style={styles.profileEmail}>{email}</Text>
          </View>
        </LinearGradient>

        {/* ── Section COMPTE ── */}
        <Text style={styles.sectionLabel}>COMPTE</Text>
        <View style={styles.card}>
          <ProfileRow
            icon="person-outline"
            label="Nom et prénom"
            value={fullName || '—'}
            onPress={() => router.push('/profil/edit')}
          />
          <ProfileRow
            icon="mail-outline"
            label="Email"
            value={email}
            onPress={() => router.push('/profil/edit')}
          />
          <ProfileRow
            icon="call-outline"
            label="Téléphone"
            value={profile?.phone ?? '—'}
            onPress={() => router.push('/profil/edit')}
          />
          <ProfileRow
            icon="card-outline"
            label="Paiement"
            value="•••• 4242"
            onPress={() => router.push('/profil/paiement')}
            last
          />
        </View>

        {/* ── Section PRÉFÉRENCES ── */}
        <Text style={styles.sectionLabel}>PRÉFÉRENCES</Text>
        <View style={styles.card}>
          <ToggleRow
            icon="notifications-outline"
            label="Notifications email"
            value={notifEmail}
            onChange={setNotifEmail}
          />
          <ToggleRow
            icon="notifications-outline"
            label="Notifications push"
            value={notifPush}
            onChange={setNotifPush}
            last
          />
        </View>

        {/* ── Section PLUS ── */}
        <Text style={styles.sectionLabel}>PLUS</Text>
        <View style={styles.card}>
          <ProfileRow
            icon="people-outline"
            label="Parrainer un ami"
            onPress={() =>
              Share.share({
                message: 'Découvre Kshare, la marketplace de paniers casher anti-gaspi ! Télécharge l\'app : https://k-share.fr',
              })
            }
          />
          <ProfileRow
            icon="storefront-outline"
            label="Devenir partenaire"
            onPress={() => Linking.openURL('https://k-share.fr')}
          />
          <ProfileRow
            icon="share-social-outline"
            label="Recommander un commerce"
            onPress={() => Linking.openURL('mailto:contact@k-share.fr?subject=Recommandation%20commerce')}
          />
          <ProfileRow
            icon="help-circle-outline"
            label="Aide et support"
            onPress={() => router.push('/profil/support')}
            last
          />
        </View>

        {/* ── Logout ── */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleSignOut}
            disabled={signingOut}
            activeOpacity={0.8}
          >
            {signingOut ? (
              <ActivityIndicator color="#EF4444" size="small" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                <Text style={styles.logoutText}>Se déconnecter</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Logout confirmation modal ── */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="log-out-outline" size={28} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>Déconnexion</Text>
            <Text style={styles.modalMessage}>
              Voulez-vous vraiment vous déconnecter ?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={confirmSignOut}
                activeOpacity={0.8}
              >
                <Text style={styles.modalConfirmText}>Se déconnecter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  // Profile header
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#3744C8',
  },
  profileInfo: {
    gap: 3,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  profileEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginBottom: 8,
    marginTop: 4,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
    gap: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3744C8',
  },
  rowValue: {
    fontSize: 13,
    color: '#6B7280',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 64,
  },

  // Logout
  logoutSection: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
