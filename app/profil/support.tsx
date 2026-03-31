import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Linking,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const API_BASE = process.env.EXPO_PUBLIC_WEBAPP_URL ?? 'https://k-share.fr';

const CATEGORIES = [
  { value: 'commande', label: 'Commande', icon: 'bag-outline' as IoniconName },
  { value: 'paiement', label: 'Paiement', icon: 'card-outline' as IoniconName },
  { value: 'compte', label: 'Mon compte', icon: 'person-outline' as IoniconName },
  { value: 'autre', label: 'Autre', icon: 'help-circle-outline' as IoniconName },
];

interface UserOrder {
  id: string;
  label: string;
  date: string;
  commerceName: string;
  amount: number;
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  created: 'En attente',
  paid: 'Confirmée',
  ready_for_pickup: 'Prête',
  picked_up: 'Récupérée',
  no_show: 'Non récupérée',
  refunded: 'Remboursée',
  cancelled_admin: 'Annulée',
};

export default function SupportPage() {
  const { user } = useAppStore();
  const params = useLocalSearchParams<{ openForm?: string; orderId?: string }>();
  const [showForm, setShowForm] = useState(params.openForm === '1');
  const [category, setCategory] = useState(params.orderId ? 'commande' : 'autre');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [ticketRef, setTicketRef] = useState('');
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(params.orderId ?? null);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Fetch user orders when category is "commande"
  useEffect(() => {
    if (category !== 'commande' || !user?.id || orders.length > 0) return;

    setLoadingOrders(true);
    supabase
      .from('orders')
      .select('id, total_amount, status, created_at, baskets(commerces(name))')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        const mapped: UserOrder[] = (data ?? []).filter((o: any) => o?.id).map((o: any) => {
          const shortId = (o.id ?? '').replace(/-/g, '').slice(-4).toUpperCase();
          const year = new Date(o.created_at).getFullYear();
          const dateStr = new Date(o.created_at).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
          });
          return {
            id: o.id,
            label: `CMD-${year}-${shortId}`,
            date: dateStr,
            commerceName: o.baskets?.commerces?.name ?? 'Commerce',
            amount: Number(o.total_amount ?? 0),
            status: o.status,
          };
        });
        setOrders(mapped);
      })
      .finally(() => setLoadingOrders(false));
  }, [category, user?.id]);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Champs requis', 'Veuillez remplir le sujet et le message.');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          space: 'client',
          firstName: user?.user_metadata?.first_name ?? user?.email?.split('@')[0] ?? 'Client',
          lastName: user?.user_metadata?.last_name ?? '',
          email: user?.email ?? '',
          subject: subject.trim(),
          message: selectedOrderId
            ? `[Commande: ${orders.find((o) => o.id === selectedOrderId)?.label ?? selectedOrderId}]\n\n${message.trim()}`
            : message.trim(),
          category,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setTicketRef(data.ticketRef ?? '');
        setSent(true);
      } else {
        Alert.alert('Erreur', data.error ?? 'Une erreur est survenue.');
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de contacter le support. Vérifiez votre connexion.');
    } finally {
      setIsSending(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setSent(false);
    setSubject('');
    setMessage('');
    setCategory('autre');
    setTicketRef('');
    setSelectedOrderId(null);
  };

  const items = [
    {
      icon: 'create-outline' as IoniconName,
      label: 'Envoyer un message',
      subtitle: 'Réponse rapide par notre équipe',
      onPress: () => setShowForm(true),
    },
    {
      icon: 'chatbubble-ellipses-outline' as IoniconName,
      label: 'FAQ',
      subtitle: 'Questions fréquentes',
      onPress: () => Linking.openURL('https://k-share.fr/faq'),
    },
    {
      icon: 'document-text-outline' as IoniconName,
      label: "Conditions d'utilisation",
      subtitle: 'CGU et politique de confidentialité',
      onPress: () => Linking.openURL('https://k-share.fr/cgu'),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => showForm ? resetForm() : router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#3744C8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {showForm ? (sent ? 'Message envoyé' : 'Nous contacter') : 'Aide et support'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: '#F4F5F9' }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Success state */}
          {sent && (
            <View style={styles.successCard}>
              <View style={styles.successCircle}>
                <Ionicons name="checkmark" size={36} color="#fff" />
              </View>
              <Text style={styles.successTitle}>Message envoyé !</Text>
              <Text style={styles.successSubtitle}>
                Référence : {ticketRef}
              </Text>
              <Text style={styles.successText}>
                Vous recevrez un accusé de réception par email. Notre équipe (assistée par IA) vous répondra dans les plus brefs délais.
              </Text>
              <TouchableOpacity style={styles.successBtn} onPress={resetForm}>
                <Text style={styles.successBtnText}>Retour</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Contact form */}
          {showForm && !sent && (
            <View style={styles.formCard}>
              {/* Category picker */}
              <Text style={styles.formLabel}>Catégorie</Text>
              <View style={styles.categoryRow}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryChip,
                      category === cat.value && styles.categoryChipActive,
                    ]}
                    onPress={() => setCategory(cat.value)}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={14}
                      color={category === cat.value ? '#3744C8' : '#6B7280'}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        category === cat.value && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Order selector (when category = commande) */}
              {category === 'commande' && (
                <>
                  <Text style={styles.formLabel}>Commande concernée</Text>
                  {loadingOrders ? (
                    <ActivityIndicator size="small" color="#3744C8" style={{ marginVertical: 8 }} />
                  ) : orders.length === 0 ? (
                    <Text style={styles.noOrdersText}>Aucune commande trouvée</Text>
                  ) : (
                    <View style={styles.orderList}>
                      {orders.map((o) => (
                        <TouchableOpacity
                          key={o.id}
                          style={[
                            styles.orderChip,
                            selectedOrderId === o.id && styles.orderChipActive,
                          ]}
                          onPress={() => setSelectedOrderId(selectedOrderId === o.id ? null : o.id)}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={styles.orderChipHeader}>
                              <Text
                                style={[
                                  styles.orderChipRef,
                                  selectedOrderId === o.id && styles.orderChipRefActive,
                                ]}
                              >
                                {o.label}
                              </Text>
                              <Text
                                style={[
                                  styles.orderChipStatus,
                                  selectedOrderId === o.id && { color: '#3744C8' },
                                ]}
                              >
                                {STATUS_LABELS[o.status] ?? o.status}
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.orderChipDetail,
                                selectedOrderId === o.id && { color: '#4B5ECC' },
                              ]}
                            >
                              {o.commerceName} · {o.date} · {o.amount.toFixed(2)}€
                            </Text>
                          </View>
                          {selectedOrderId === o.id && (
                            <Ionicons name="checkmark-circle" size={20} color="#3744C8" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}

              {/* Subject */}
              <Text style={styles.formLabel}>Sujet</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Problème avec ma commande"
                placeholderTextColor="#9CA3AF"
                value={subject}
                onChangeText={setSubject}
                maxLength={100}
              />

              {/* Message */}
              <Text style={styles.formLabel}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Décrivez votre demande en détail..."
                placeholderTextColor="#9CA3AF"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={2000}
              />

              {/* Email info */}
              <View style={styles.emailInfo}>
                <Ionicons name="mail-outline" size={14} color="#9CA3AF" />
                <Text style={styles.emailInfoText}>
                  Réponse envoyée à : {user?.email ?? '—'}
                </Text>
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitBtn, isSending && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={isSending}
                activeOpacity={0.85}
              >
                {isSending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#fff" />
                    <Text style={styles.submitBtnText}>Envoyer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Menu items (when form is hidden) */}
          {!showForm && !sent && (
            <>
              <View style={styles.card}>
                {items.map((item, i) => (
                  <React.Fragment key={item.label}>
                    <TouchableOpacity
                      style={styles.row}
                      onPress={item.onPress}
                      activeOpacity={0.7}
                    >
                      <View style={styles.rowIconWrap}>
                        <Ionicons name={item.icon} size={18} color="#6B7280" />
                      </View>
                      <View style={styles.rowContent}>
                        <Text style={styles.rowLabel}>{item.label}</Text>
                        <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                    </TouchableOpacity>
                    {i < items.length - 1 && <View style={styles.divider} />}
                  </React.Fragment>
                ))}
              </View>

              {/* Direct email fallback */}
              <TouchableOpacity
                style={styles.emailFallback}
                onPress={() => Linking.openURL('mailto:contact@k-share.fr')}
              >
                <Ionicons name="mail-outline" size={14} color="#9CA3AF" />
                <Text style={styles.emailFallbackText}>
                  Ou écrivez-nous à contact@k-share.fr
                </Text>
              </TouchableOpacity>

              <Text style={styles.version}>Kshare v1.0.0</Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
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
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  scrollContent: {
    padding: 16,
    gap: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
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
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 64,
  },
  emailFallback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  emailFallbackText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  noOrdersText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  orderList: {
    gap: 8,
  },
  orderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  orderChipActive: {
    backgroundColor: '#EEF0FF',
    borderColor: '#3744C8',
  },
  orderChipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  orderChipRef: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  orderChipRefActive: {
    color: '#3744C8',
  },
  orderChipStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  orderChipDetail: {
    fontSize: 12,
    color: '#6B7280',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  // ── Form ──
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  categoryChipActive: {
    backgroundColor: '#EEF0FF',
    borderColor: '#3744C8',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryChipTextActive: {
    color: '#3744C8',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  emailInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emailInfoText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3744C8',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  // ── Success ──
  successCard: {
    backgroundColor: '#fff',
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
      android: { elevation: 4 },
    }),
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  successSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3744C8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  successText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  successBtn: {
    backgroundColor: '#3744C8',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  successBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
