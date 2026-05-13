import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';

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

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  open: { label: 'Nouveau', color: '#DC2626', bg: '#FEE2E2' },
  in_progress: { label: 'En cours', color: '#2563EB', bg: '#DBEAFE' },
  resolved: { label: 'Résolu', color: '#16A34A', bg: '#DCFCE7' },
};

function normalizeMessage(m: TicketMessage, idx: number) {
  const sender = (m.sender ?? m.role ?? 'user') as 'user' | 'admin' | 'ai';
  return {
    key: `${idx}-${m.date ?? m.created_at ?? idx}`,
    sender,
    text: m.content ?? m.text ?? '',
    name: m.name ?? (sender === 'admin' ? 'Équipe Kshare' : sender === 'ai' ? 'Kira (IA)' : 'Vous'),
    date: m.date ?? m.created_at ?? null,
  };
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

async function fetchTicket(ticketId: string): Promise<Ticket | null> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, category, description, status, created_at, updated_at, messages, metadata')
    .eq('id', ticketId)
    .maybeSingle();
  if (error) return null;
  return data as Ticket | null;
}

export default function DemandeDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAppStore();
  const qc = useQueryClient();
  const flatListRef = useRef<FlatList>(null);

  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const { data: ticket, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => fetchTicket(id),
    enabled: !!id,
    refetchInterval: 15000, // Poll toutes les 15s pour de nouvelles réponses
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Scroll automatique vers le bas quand nouveaux messages
  useEffect(() => {
    if (ticket?.messages?.length) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [ticket?.messages?.length]);

  const handleSendReply = async () => {
    if (!reply.trim() || !ticket || !user?.id) return;
    setSending(true);

    try {
      const existingMessages = ticket.messages ?? [];
      const newMessage: TicketMessage = {
        sender: 'user',
        role: 'user',
        name: user.email?.split('@')[0] ?? 'Client',
        text: reply.trim(),
        date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const updatedMessages = [...existingMessages, newMessage];

      const { error } = await supabase
        .from('support_tickets')
        .update({
          messages: updatedMessages,
          // Rouvrir le ticket si résolu (réponse du client = nouvelle question)
          status: ticket.status === 'resolved' ? 'in_progress' : ticket.status,
        })
        .eq('id', ticket.id);

      if (error) throw error;

      setReply('');
      await qc.invalidateQueries({ queryKey: ['ticket', id] });
      await qc.invalidateQueries({ queryKey: ['user-tickets', user.id] });
    } catch (err) {
      Alert.alert('Erreur', "Impossible d'envoyer votre réponse. Veuillez réessayer.");
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerWrap]}>
        <ActivityIndicator size="large" color="#3744C8" />
      </View>
    );
  }

  if (!ticket) {
    return (
      <SafeAreaView style={[styles.container, styles.centerWrap]}>
        <Text style={styles.errorText}>Demande introuvable</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const messages = (ticket.messages ?? []).map(normalizeMessage);
  const status = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open;
  const ticketRef =
    (ticket.metadata as { ticket_ref?: string } | null)?.ticket_ref ??
    `#${ticket.id.slice(0, 6).toUpperCase()}`;
  const catLabel = CATEGORY_LABELS[ticket.category] ?? ticket.category;
  const isResolved = ticket.status === 'resolved';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#3744C8" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{catLabel}</Text>
          <Text style={styles.headerSubtitle}>{ticketRef}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.key}
          contentContainerStyle={styles.listContent}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListHeaderComponent={
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={18} color="#3744C8" />
              <Text style={styles.infoText}>
                Conversation avec l&apos;équipe support. Les réponses apparaissent automatiquement ici.
              </Text>
            </View>
          }
          renderItem={({ item: msg }) => {
            const isUser = msg.sender === 'user';
            const isAI = msg.sender === 'ai';
            return (
              <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAdmin]}>
                {!isUser && (
                  <View style={[styles.avatar, isAI ? styles.avatarAI : styles.avatarAdmin]}>
                    <Ionicons
                      name={isAI ? 'sparkles' : 'briefcase'}
                      size={16}
                      color="#fff"
                    />
                  </View>
                )}
                <View
                  style={[
                    styles.bubble,
                    isUser ? styles.bubbleUser : isAI ? styles.bubbleAI : styles.bubbleAdmin,
                  ]}
                >
                  {!isUser && (
                    <Text style={[styles.senderName, isAI ? styles.senderNameAI : styles.senderNameAdmin]}>
                      {msg.name}
                    </Text>
                  )}
                  <Text style={[styles.messageText, isUser && styles.messageTextUser]}>
                    {msg.text}
                  </Text>
                  <Text style={[styles.timestamp, isUser && styles.timestampUser]}>
                    {formatTime(msg.date)}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        {/* Input area */}
        <View style={styles.inputContainer}>
          {isResolved && (
            <View style={styles.reopenNotice}>
              <Ionicons name="refresh-circle" size={14} color="#6B7280" />
              <Text style={styles.reopenText}>
                Cette demande est résolue. Répondre la rouvrira automatiquement.
              </Text>
            </View>
          )}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={reply}
              onChangeText={setReply}
              placeholder="Écrivez votre message..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={2000}
              editable={!sending}
            />
            <TouchableOpacity
              onPress={handleSendReply}
              disabled={!reply.trim() || sending}
              style={[
                styles.sendBtn,
                (!reply.trim() || sending) && styles.sendBtnDisabled,
              ]}
              activeOpacity={0.85}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECEEF4' },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  errorText: { fontSize: 15, color: '#6B7280' },
  backLink: { paddingVertical: 10, paddingHorizontal: 20 },
  backLinkText: { color: '#3744C8', fontWeight: '600' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  headerSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusLabel: { fontSize: 11, fontWeight: '700' },

  listContent: { padding: 16, paddingBottom: 24, gap: 8 },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  infoText: { flex: 1, fontSize: 12, color: '#4338CA', lineHeight: 16 },

  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowAdmin: { justifyContent: 'flex-start' },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  avatarAdmin: { backgroundColor: '#3744C8' },
  avatarAI: { backgroundColor: '#8B5CF6' },

  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
  bubbleUser: {
    backgroundColor: '#3744C8',
    borderBottomRightRadius: 4,
  },
  bubbleAdmin: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
    }),
  },
  bubbleAI: {
    backgroundColor: '#F5F3FF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },

  senderName: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  senderNameAdmin: { color: '#3744C8' },
  senderNameAI: { color: '#7C3AED' },

  messageText: { fontSize: 14, color: '#111827', lineHeight: 19 },
  messageTextUser: { color: '#fff' },

  timestamp: { fontSize: 10, color: '#9CA3AF', alignSelf: 'flex-end', marginTop: 2 },
  timestampUser: { color: 'rgba(255,255,255,0.7)' },

  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 10,
    paddingBottom: Platform.OS === 'ios' ? 10 : 14,
  },
  reopenNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 6,
  },
  reopenText: { fontSize: 11, color: '#6B7280', flex: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    color: '#111827',
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3744C8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#D1D5DB' },
});
