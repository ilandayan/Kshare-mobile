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

export default function SignalerPage() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = () => {
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
            Le paiement est bloqué le temps que notre équipe vérifie la fermeture du commerce. Si confirmé, le débit sera annulé.
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
        <Text style={styles.headerTitle}>Commerce fermé</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Icon + explanation */}
        <View style={styles.mainCard}>
          <View style={styles.iconWrap}>
            <Ionicons name="lock-closed" size={32} color="#EF4444" />
          </View>
          <Text style={styles.mainTitle}>Le commerce est fermé ?</Text>
          <Text style={styles.mainDescription}>
            Si le commerce est fermé pendant le créneau de retrait, signalez-le ci-dessous. Le paiement sera bloqué et notre équipe vérifiera la situation.
          </Text>
        </View>

        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color="#3744C8" />
          <Text style={styles.infoBannerText}>
            Si la fermeture est confirmée, le débit sera annulé et vous ne serez pas prélevé.
          </Text>
        </View>

        {/* Comment */}
        <Text style={styles.sectionLabel}>COMMENTAIRE (OPTIONNEL)</Text>
        <View style={styles.commentCard}>
          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            placeholder="Précisions supplémentaires…"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={sending}
          activeOpacity={0.8}
        >
          <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
          <Text style={styles.submitBtnText}>
            {sending ? 'Envoi en cours…' : 'Signaler la fermeture'}
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

  // Main card
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 12,
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
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  mainDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
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
    minHeight: 80,
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
