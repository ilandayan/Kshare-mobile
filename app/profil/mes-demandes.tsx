import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TicketMessage {
  sender?: 'user' | 'admin' | 'ai';
  role?: 'user' | 'admin' | 'ai';
  name?: string;
  text?: string;
  content?: string;
  date?: string;
  created_at?: string;
}

interface Ticket {
  id: string;
  category: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  created_at: string;
  updated_at: string;
  messages: TicketMessage[];
  metadata: Record<string, unknown> | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  question_generale: 'Question générale',
  probleme_commande: 'Problème commande',
  commande: 'Commande',
  paiement: 'Paiement',
  compte: 'Mon compte',
  bug_technique: 'Bug technique',
  partenariat: 'Partenariat',
  autre: 'Autre',
};

const CATEGORY_ICONS: Record<string, IoniconName> = {
  commande: 'bag-outline',
  probleme_commande: 'bag-outline',
  paiement: 'card-outline',
  compte: 'person-outline',
  question_generale: 'help-circle-outline',
  bug_technique: 'bug-outline',
  partenariat: 'handshake-outline' as IoniconName,
  autre: 'chatbubble-ellipses-outline',
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; dot: string }
> = {
  open: { label: 'Nouveau', color: '#DC2626', bg: '#FEE2E2', dot: '#DC2626' },
  in_progress: { label: 'En cours', color: '#2563EB', bg: '#DBEAFE', dot: '#2563EB' },
  resolved: { label: 'Résolu', color: '#16A34A', bg: '#DCFCE7', dot: '#16A34A' },
};

function getLastMessage(ticket: Ticket): { text: string; isFromAdmin: boolean; isFromAI: boolean; date: string | null } {
  const msgs = ticket.messages ?? [];
  if (msgs.length === 0) {
    return { text: ticket.description, isFromAdmin: false, isFromAI: false, date: ticket.created_at };
  }
  const last = msgs[msgs.length - 1];
  const sender = last.sender ?? last.role ?? 'user';
  return {
    text: last.content ?? last.text ?? '',
    isFromAdmin: sender === 'admin',
    isFromAI: sender === 'ai',
    date: last.created_at ?? last.date ?? null,
  };
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

async function fetchUserTickets(userId: string): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, category, description, status, created_at, updated_at, messages, metadata')
    .eq('client_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Ticket[];
}

export default function MesDemandesPage() {
  const { user } = useAppStore();

  const { data: tickets = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['user-tickets', user?.id],
    queryFn: () => fetchUserTickets(user!.id),
    enabled: !!user?.id,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#3744C8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes demandes</Text>
        <TouchableOpacity
          onPress={() => router.push('/profil/support?openForm=1')}
          style={styles.newBtn}
        >
          <Ionicons name="add" size={22} color="#3744C8" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#3744C8" />
        </View>
      ) : tickets.length === 0 ? (
        <View style={styles.centerWrap}>
          <View style={styles.emptyCircle}>
            <Ionicons name="chatbubbles-outline" size={42} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>Aucune demande</Text>
          <Text style={styles.emptySubtitle}>
            Vous n&apos;avez encore envoyé aucune demande à notre équipe support.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push('/profil/support?openForm=1')}
            activeOpacity={0.85}
          >
            <Ionicons name="create-outline" size={18} color="#fff" />
            <Text style={styles.emptyBtnText}>Nouvelle demande</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3744C8" />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const cat = (item.category ?? 'autre').toLowerCase();
            const catLabel = CATEGORY_LABELS[cat] ?? cat;
            const catIcon = CATEGORY_ICONS[cat] ?? 'chatbubble-ellipses-outline';
            const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.open;
            const lastMsg = getLastMessage(item);
            const ref =
              (item.metadata as { ticket_ref?: string } | null)?.ticket_ref ??
              `#${item.id.slice(0, 6).toUpperCase()}`;
            const unread = lastMsg.isFromAdmin || lastMsg.isFromAI;

            return (
              <TouchableOpacity
                style={styles.ticketCard}
                onPress={() => router.push(`/profil/demande/${item.id}`)}
                activeOpacity={0.8}
              >
                {/* Avatar / Icon */}
                <View style={styles.avatarWrap}>
                  <Ionicons name={catIcon} size={22} color="#3744C8" />
                  {unread && item.status !== 'resolved' && (
                    <View style={styles.unreadDot} />
                  )}
                </View>

                {/* Content */}
                <View style={styles.ticketContent}>
                  <View style={styles.ticketHeader}>
                    <Text style={styles.ticketTitle} numberOfLines={1}>
                      {catLabel}
                    </Text>
                    <Text style={styles.ticketDate}>{formatRelativeDate(lastMsg.date)}</Text>
                  </View>

                  <View style={styles.ticketPreviewRow}>
                    {lastMsg.isFromAdmin && (
                      <Text style={styles.previewPrefix}>Équipe Kshare : </Text>
                    )}
                    {lastMsg.isFromAI && (
                      <Text style={styles.previewPrefix}>🤖 Kira : </Text>
                    )}
                    <Text style={styles.ticketPreview} numberOfLines={1}>
                      {lastMsg.text}
                    </Text>
                  </View>

                  <View style={styles.ticketFooter}>
                    <Text style={styles.ticketRef}>{ref}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                      <View style={[styles.statusDot, { backgroundColor: status.dot }]} />
                      <Text style={[styles.statusLabel, { color: status.color }]}>
                        {status.label}
                      </Text>
                    </View>
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECEEF4' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  newBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },

  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3744C8',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  listContent: { paddingVertical: 8, paddingBottom: 120 },
  separator: { height: 1, backgroundColor: '#E5E7EB', marginLeft: 72 },

  ticketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#fff',
  },
  ticketContent: { flex: 1, gap: 3 },
  ticketHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ticketTitle: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  ticketDate: { fontSize: 12, color: '#9CA3AF', marginLeft: 8 },
  ticketPreviewRow: { flexDirection: 'row', alignItems: 'center' },
  previewPrefix: { fontSize: 13, fontWeight: '600', color: '#3744C8' },
  ticketPreview: { fontSize: 13, color: '#6B7280', flex: 1 },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  ticketRef: { fontSize: 11, color: '#9CA3AF', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 11, fontWeight: '700' },
});
