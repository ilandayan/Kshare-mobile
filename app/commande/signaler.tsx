import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface ReportReason {
  id: string;
  icon: IoniconName;
  label: string;
  description: string;
}

const REASONS: ReportReason[] = [
  {
    id: 'closed',
    icon: 'lock-closed-outline',
    label: 'Commerce fermé',
    description: 'Le commerce est fermé pendant le créneau de retrait',
  },
  {
    id: 'non_conforming',
    icon: 'alert-circle-outline',
    label: 'Panier non conforme',
    description: 'Le contenu du panier ne correspond pas à la description',
  },
  {
    id: 'other',
    icon: 'chatbubble-ellipses-outline',
    label: 'Autre problème',
    description: 'Un autre problème empêche la récupération du panier',
  },
];

export default function SignalerPage() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = () => {
    if (!selectedReason) return;
    setSending(true);
    // Simulate API call — will be replaced with real endpoint
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 1500);
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successContainer}>
          <View style={styles.successCircle}>
            <Ionicons name="shield-checkmark" size={40} color="#fff" />
          </View>
          <Text style={styles.successTitle}>Signalement envoyé</Text>
          <Text style={styles.successSubtitle}>
            Le paiement est bloqué le temps que notre équipe vérifie la situation. Vous recevrez une notification avec le résultat.
          </Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.backBtnText}>Retour à ma commande</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
          <Ionicons name="chevron-back" size={24} color="#3744C8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Signaler un problème</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color="#3744C8" />
          <Text style={styles.infoBannerText}>
            Votre paiement sera bloqué le temps que notre équipe vérifie votre signalement. Si le problème est confirmé, le débit sera annulé.
          </Text>
        </View>

        {/* Reason selection */}
        <Text style={styles.sectionLabel}>QUEL EST LE PROBLÈME ?</Text>
        <View style={styles.reasonsCard}>
          {REASONS.map((reason, i) => (
            <React.Fragment key={reason.id}>
              <TouchableOpacity
                style={[
                  styles.reasonRow,
                  selectedReason === reason.id && styles.reasonRowSelected,
                ]}
                onPress={() => setSelectedReason(reason.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.reasonIconWrap,
                    selectedReason === reason.id
                      ? { backgroundColor: '#EF444415' }
                      : { backgroundColor: '#F3F4F6' },
                  ]}
                >
                  <Ionicons
                    name={reason.icon}
                    size={18}
                    color={selectedReason === reason.id ? '#EF4444' : '#6B7280'}
                  />
                </View>
                <View style={styles.reasonContent}>
                  <Text
                    style={[
                      styles.reasonLabel,
                      selectedReason === reason.id && { color: '#EF4444' },
                    ]}
                  >
                    {reason.label}
                  </Text>
                  <Text style={styles.reasonDescription}>{reason.description}</Text>
                </View>
                <View
                  style={[
                    styles.radioOuter,
                    selectedReason === reason.id && styles.radioOuterSelected,
                  ]}
                >
                  {selectedReason === reason.id && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
              {i < REASONS.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Comment */}
        <Text style={styles.sectionLabel}>COMMENTAIRE (OPTIONNEL)</Text>
        <View style={styles.commentCard}>
          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            placeholder="Décrivez le problème rencontré…"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, !selectedReason && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!selectedReason || sending}
          activeOpacity={0.8}
        >
          <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
          <Text style={styles.submitBtnText}>
            {sending ? 'Envoi en cours…' : 'Envoyer le signalement'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F9',
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
  headerBackBtn: {
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
    gap: 16,
    paddingBottom: 40,
  },

  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },

  // Section
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    marginTop: 4,
  },

  // Reasons
  reasonsCard: {
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
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  reasonRowSelected: {
    backgroundColor: '#FEF2F210',
  },
  reasonIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  reasonContent: {
    flex: 1,
    gap: 2,
  },
  reasonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  reasonDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#EF4444',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 68,
  },

  // Comment
  commentCard: {
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
  commentInput: {
    padding: 16,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
  },

  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Success
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#3744C8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  successSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  backBtn: {
    backgroundColor: '#3744C8',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 12,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
