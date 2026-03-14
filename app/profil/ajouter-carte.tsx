import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

export default function AjouterCartePage() {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const rawDigits = cardNumber.replace(/\D/g, '');
  const rawExpiry = expiry.replace(/\D/g, '');
  const isValid =
    rawDigits.length >= 15 &&
    rawExpiry.length === 4 &&
    cvc.length >= 3 &&
    name.trim().length > 0;

  const detectedBrand =
    rawDigits.startsWith('4')
      ? 'Visa'
      : rawDigits.startsWith('5') || rawDigits.startsWith('2')
        ? 'Mastercard'
        : rawDigits.startsWith('3')
          ? 'Amex'
          : null;

  const handleSave = () => {
    if (!isValid) return;
    setSaving(true);
    // Simulate Stripe tokenization delay
    setTimeout(() => {
      setSaving(false);
      setSuccess(true);
      setTimeout(() => router.back(), 1200);
    }, 1500);
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successContainer}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={40} color="#fff" />
          </View>
          <Text style={styles.successTitle}>Carte ajoutée !</Text>
          <Text style={styles.successSubtitle}>
            Votre carte {detectedBrand ?? ''} •••• {rawDigits.slice(-4)} a été enregistrée
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#3744C8" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ajouter une carte</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card preview */}
          <View style={styles.cardPreview}>
            <View style={styles.cardPreviewTop}>
              <Ionicons name="card" size={28} color="rgba(255,255,255,0.8)" />
              {detectedBrand && (
                <Text style={styles.cardPreviewBrand}>{detectedBrand}</Text>
              )}
            </View>
            <Text style={styles.cardPreviewNumber}>
              {cardNumber || '•••• •••• •••• ••••'}
            </Text>
            <View style={styles.cardPreviewBottom}>
              <View>
                <Text style={styles.cardPreviewLabel}>TITULAIRE</Text>
                <Text style={styles.cardPreviewValue}>
                  {name.toUpperCase() || 'NOM PRÉNOM'}
                </Text>
              </View>
              <View>
                <Text style={styles.cardPreviewLabel}>EXPIRE</Text>
                <Text style={styles.cardPreviewValue}>
                  {expiry || 'MM/AA'}
                </Text>
              </View>
            </View>
          </View>

          {/* Form fields */}
          <View style={styles.field}>
            <Text style={styles.label}>Numéro de carte</Text>
            <View style={styles.inputRow}>
              <Ionicons name="card-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={cardNumber}
                onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor="#D1D5DB"
                keyboardType="number-pad"
                maxLength={19}
              />
              {rawDigits.length >= 15 && (
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              )}
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Date d'expiration</Text>
              <View style={styles.inputRow}>
                <Ionicons name="calendar-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  value={expiry}
                  onChangeText={(t) => setExpiry(formatExpiry(t))}
                  placeholder="MM/AA"
                  placeholderTextColor="#D1D5DB"
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>
            </View>

            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>CVC</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  value={cvc}
                  onChangeText={(t) => setCvc(t.replace(/\D/g, '').slice(0, 4))}
                  placeholder="123"
                  placeholderTextColor="#D1D5DB"
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                />
              </View>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Nom sur la carte</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={name}
                onChangeText={setName}
                placeholder="Jean Dupont"
                placeholderTextColor="#D1D5DB"
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Security note */}
          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark" size={16} color="#10B981" />
            <Text style={styles.securityText}>
              Vos données sont chiffrées et protégées par Stripe. Kshare ne stocke jamais vos informations bancaires.
            </Text>
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, !isValid && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!isValid || saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <Text style={styles.saveBtnText}>Vérification…</Text>
            ) : (
              <Text style={styles.saveBtnText}>Ajouter la carte</Text>
            )}
          </TouchableOpacity>
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
    padding: 20,
    gap: 18,
    paddingBottom: 40,
  },

  // Card preview
  cardPreview: {
    backgroundColor: '#1e2a78',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#1e2a78',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  cardPreviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardPreviewBrand: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  cardPreviewNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  cardPreviewBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardPreviewLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    marginBottom: 2,
  },
  cardPreviewValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.5,
  },

  // Form
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  inputIcon: {
    flexShrink: 0,
  },
  inputWithIcon: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    padding: 0,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },

  // Security
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 12,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
  },

  // Save
  saveBtn: {
    backgroundColor: '#3744C8',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
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
    backgroundColor: '#10B981',
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
  },
});
