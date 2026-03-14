import React, { useState, useRef } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { KLogo } from '@/components/KLogo';

async function requestLocationPermission() {
  if (Platform.OS === 'web') return;
  try {
    const Location = require('expo-location');
    await Location.requestForegroundPermissionsAsync();
  } catch {
    // Silently ignore — user can grant later
  }
}

const BRAND = '#3744C8';
const BRAND_LIGHT = '#E8EAFC';

export default function ConnexionPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Champs requis', 'Veuillez renseigner votre email et mot de passe.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Email invalide', 'Veuillez entrer une adresse email valide.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        const message =
          error.message === 'Invalid login credentials'
            ? 'Email ou mot de passe incorrect.'
            : error.message === 'Email not confirmed'
              ? 'Veuillez confirmer votre email avant de vous connecter.'
              : error.message;
        Alert.alert('Erreur de connexion', message);
        return;
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profile && profile.role !== 'client') {
          await supabase.auth.signOut();
          Alert.alert(
            'Accès non autorisé',
            "L'application mobile Kshare est réservée aux clients. Les commerçants, associations et administrateurs doivent utiliser la web app.",
          );
          return;
        }

        // Request location permission after successful login
        await requestLocationPermission();

        router.replace('/(tabs)');
      }
    } catch {
      Alert.alert('Erreur', 'Une erreur inattendue est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#060d3a', '#0a1354', '#1838a8', '#2858d6']}
      start={{ x: 0, y: 0.6 }}
      end={{ x: 1, y: 0.4 }}
      style={styles.gradient}
    >
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
          {/* ── Branded Header ── */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <KLogo size={66} />
              <Text style={styles.logoShare}>share</Text>
            </View>
            <Text style={styles.tagline}>Paniers casher anti-gaspi</Text>
          </View>

          {/* ── Form Card ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Connexion</Text>
            <Text style={styles.cardSubtitle}>
              Connectez-vous pour découvrir les paniers du jour
            </Text>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
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
                  returnKeyType="next"
                  editable={!isLoading}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  accessibilityLabel="Adresse email"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe</Text>
              <View
                style={[
                  styles.inputWrapper,
                  passwordFocused && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={passwordFocused ? BRAND : '#9ca3af'}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Votre mot de passe"
                  placeholderTextColor="#b0b5c0"
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
                  editable={!isLoading}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  accessibilityLabel="Mot de passe"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                  }
                >
                  <View style={styles.eyeIconWrap}>
                    <Text style={styles.eyeEmoji}>{'\u{1F9FF}'}</Text>
                    {!showPassword && (
                      <View style={styles.eyeCrossWrap} pointerEvents="none">
                        <View style={styles.eyeCrossLine} />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/mot-de-passe-oublie')}
                disabled={isLoading}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="link"
                accessibilityLabel="Mot de passe oublié"
                style={styles.forgotButton}
              >
                <Text style={styles.forgotLink}>Mot de passe oublié ?</Text>
              </TouchableOpacity>
            </View>

            {/* CTA */}
            <TouchableOpacity
              onPress={handleSignIn}
              disabled={isLoading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Se connecter"
              style={[styles.ctaButtonOuter, isLoading && styles.ctaButtonDisabled]}
            >
              <LinearGradient
                colors={['#060d3a', '#0a1354', '#1838a8', '#2858d6']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.ctaGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <View style={styles.ctaInner}>
                    <Text style={styles.ctaText}>Se connecter</Text>
                    <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Separator */}
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <View style={styles.separatorBadge}>
                <Text style={styles.separatorText}>ou</Text>
              </View>
              <View style={styles.separatorLine} />
            </View>

            {/* Create Account */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/(auth)/inscription')}
              disabled={isLoading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Créer un compte"
            >
              <Ionicons name="person-add-outline" size={18} color={BRAND} />
              <Text style={styles.secondaryButtonText}>Créer un compte</Text>
            </TouchableOpacity>
          </View>

          {/* Footer note */}
          <View style={styles.footer}>
            <Ionicons name="storefront-outline" size={14} color="#9ca3af" />
            <Text style={styles.footerText}>
              Commerçant ou association ?{' '}
              <Text style={styles.footerLink}>k-share.fr</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  /* ── Header ── */
  header: {
    paddingTop: Platform.OS === 'ios' ? 70 : 56,
    paddingBottom: 48,
    alignItems: 'center',
    overflow: 'hidden',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  logoShare: {
    fontSize: 42,
    fontWeight: '300',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginLeft: -14,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    fontWeight: '500',
  },

  /* ── Card ── */
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    marginTop: -20,
    marginHorizontal: 14,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 24,
    lineHeight: 20,
  },

  /* ── Inputs ── */
  inputGroup: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 7,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotLink: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND,
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
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  eyeEmoji: {
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
  },
  eyeCrossWrap: {
    position: 'absolute',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeCrossLine: {
    width: 32,
    height: 3,
    backgroundColor: '#374151',
    borderRadius: 2,
    transform: [{ translateX: -1 }, { translateY: 1 }, { rotate: '-45deg' }],
  },

  /* ── CTA ── */
  ctaButtonOuter: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#0a1354',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  ctaGradient: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
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

  /* ── Separator ── */
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  separatorBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    marginHorizontal: 12,
  },
  separatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* ── Secondary Button ── */
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: BRAND_LIGHT,
    backgroundColor: BRAND_LIGHT,
    borderRadius: 14,
    paddingVertical: 15,
  },
  secondaryButtonText: {
    color: BRAND,
    fontSize: 15,
    fontWeight: '700',
  },

  /* ── Footer ── */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
  footerLink: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
