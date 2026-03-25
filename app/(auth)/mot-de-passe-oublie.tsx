import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

const BRAND = '#3744C8';
const BRAND_LIGHT = '#E8EAFC';

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);

  const handleResetPassword = async () => {
    const trimmed = email.trim().toLowerCase();

    if (!trimmed) {
      Alert.alert('Champ requis', 'Veuillez renseigner votre adresse email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      Alert.alert('Email invalide', 'Veuillez entrer une adresse email valide.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: 'https://k-share.fr/auth/reset-password',
      });

      if (error) {
        if (error.message.includes('rate limit')) {
          Alert.alert(
            'Trop de tentatives',
            'Veuillez patienter quelques minutes avant de réessayer.',
          );
          return;
        }
      }

      setIsSent(true);
    } catch {
      Alert.alert('Erreur', 'Une erreur inattendue est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={styles.decoCircle1} />
            <View style={styles.decoCircle2} />

            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Retour"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={22} color="#ffffff" />
            </TouchableOpacity>

            <View style={styles.headerIcon}>
              <Ionicons name="lock-closed-outline" size={32} color={BRAND} />
            </View>
            <Text style={styles.headerTitle}>
              {isSent ? 'Email envoyé !' : 'Mot de passe oublié'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isSent
                ? 'Vérifiez votre boîte de réception'
                : 'Pas de panique, on vous envoie un lien'}
            </Text>
          </View>

          {/* ── Card ── */}
          <View style={styles.card}>
            {isSent ? (
              /* ── Success State ── */
              <View style={styles.successContent}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark-circle" size={56} color="#10b981" />
                </View>

                <Text style={styles.successText}>
                  Si un compte existe avec l'adresse{' '}
                  <Text style={styles.emailBold}>{email.trim().toLowerCase()}</Text>,
                  vous recevrez un lien pour reinitialiser votre mot de passe.
                </Text>

                <View style={styles.tipBox}>
                  <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
                  <Text style={styles.tipText}>
                    Pensez a verifier vos spams si vous ne voyez pas l'email.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.ctaButton}
                  onPress={() => router.back()}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Retour a la connexion"
                >
                  <View style={styles.ctaInner}>
                    <Text style={styles.ctaText}>Retour a la connexion</Text>
                    <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setIsSent(false);
                    setEmail('');
                  }}
                  style={styles.retryLink}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Renvoyer un email"
                >
                  <Ionicons name="refresh-outline" size={16} color={BRAND} />
                  <Text style={styles.retryLinkText}>Essayer une autre adresse</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* ── Form State ── */
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Adresse email</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      emailFocused && styles.inputWrapperFocused,
                    ]}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color={emailFocused ? BRAND : '#9ca3af'}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="votre@email.com"
                      placeholderTextColor="#b0b5c0"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      returnKeyType="done"
                      onSubmitEditing={handleResetPassword}
                      editable={!isLoading}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      accessibilityLabel="Adresse email"
                      autoFocus
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.ctaButton, isLoading && styles.ctaButtonDisabled]}
                  onPress={handleResetPassword}
                  disabled={isLoading}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Envoyer le lien de reinitialisation"
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <View style={styles.ctaInner}>
                      <Text style={styles.ctaText}>Envoyer le lien</Text>
                      <Ionicons name="send-outline" size={16} color="#ffffff" />
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.back()}
                  style={styles.cancelLink}
                  disabled={isLoading}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Retour a la connexion"
                >
                  <Ionicons name="arrow-back" size={16} color="#6b7280" />
                  <Text style={styles.cancelLinkText}>Retour a la connexion</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  /* ── Header ── */
  header: {
    backgroundColor: BRAND,
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: 48,
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  decoCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -30,
    right: -50,
  },
  decoCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: 0,
    left: -40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },

  /* ── Card ── */
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    marginTop: -20,
  },

  /* ── Inputs ── */
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 7,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    backgroundColor: '#f8f9fb',
    overflow: 'hidden',
  },
  inputWrapperFocused: {
    borderColor: BRAND,
    backgroundColor: '#ffffff',
    ...Platform.select({
      ios: {
        shadowColor: BRAND,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  inputIcon: {
    marginLeft: 14,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 15 : 13,
    fontSize: 15,
    color: '#111827',
  },

  /* ── CTA ── */
  ctaButton: {
    backgroundColor: BRAND,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: BRAND,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* ── Links ── */
  cancelLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  cancelLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },

  /* ── Success State ── */
  successContent: {
    alignItems: 'center',
    gap: 16,
    paddingTop: 8,
  },
  successIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  successText: {
    fontSize: 15,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  emailBold: {
    fontWeight: '700',
    color: '#111827',
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8f9fb',
    borderRadius: 12,
    padding: 14,
    width: '100%',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  retryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
  },
  retryLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND,
  },
});
