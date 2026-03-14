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
import { supabase } from '@/lib/supabase';

async function requestLocationPermission() {
  if (Platform.OS === 'web') return;
  try {
    const Location = require('expo-location');
    await Location.requestForegroundPermissionsAsync();
  } catch {
    // Silently ignore
  }
}

const BRAND = '#3744C8';
const BRAND_LIGHT = '#E8EAFC';

export default function InscriptionPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Focus states
  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [lastNameFocused, setLastNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  // Refs
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const handleSignUp = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Email invalide', 'Veuillez entrer une adresse email valide.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Mot de passe trop court', 'Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
            role: 'client',
          },
        },
      });

      if (error) {
        const message =
          error.message === 'User already registered'
            ? 'Un compte existe deja avec cet email. Veuillez vous connecter.'
            : error.message;
        Alert.alert('Erreur d\'inscription', message);
        return;
      }

      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          email: email.trim().toLowerCase(),
          full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          role: 'client',
        });

        if (profileError) {
          // Profile might already exist via trigger - not critical
        }

        if (data.session) {
          await requestLocationPermission();
          router.replace('/(tabs)');
        } else {
          Alert.alert(
            'Vérification requise',
            'Un email de confirmation vous a été envoyé. Veuillez confirmer votre compte avant de vous connecter.',
            [{ text: 'OK', onPress: () => router.replace('/(auth)/connexion') }],
          );
        }
      }
    } catch {
      Alert.alert('Erreur', 'Une erreur inattendue est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 8 ? 2 : 3;
  const strengthColors = ['#e5e7eb', '#ef4444', '#f59e0b', '#10b981'];
  const strengthLabels = ['', 'Faible', 'Moyen', 'Fort'];

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
              <Ionicons name="person-add-outline" size={30} color={BRAND} />
            </View>
            <Text style={styles.headerTitle}>Créer un compte</Text>
            <Text style={styles.headerSubtitle}>
              Rejoignez Kshare et sauvez des paniers casher
            </Text>
          </View>

          {/* ── Card ── */}
          <View style={styles.card}>
            {/* Name Row */}
            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <Text style={styles.label}>Prenom</Text>
                <View style={[styles.inputWrapper, firstNameFocused && styles.inputWrapperFocused]}>
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={firstNameFocused ? BRAND : '#9ca3af'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Prenom"
                    placeholderTextColor="#b0b5c0"
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="next"
                    editable={!isLoading}
                    onFocus={() => setFirstNameFocused(true)}
                    onBlur={() => setFirstNameFocused(false)}
                    onSubmitEditing={() => lastNameRef.current?.focus()}
                    accessibilityLabel="Prenom"
                  />
                </View>
              </View>
              <View style={styles.nameField}>
                <Text style={styles.label}>Nom</Text>
                <View style={[styles.inputWrapper, lastNameFocused && styles.inputWrapperFocused]}>
                  <TextInput
                    ref={lastNameRef}
                    style={[styles.input, { paddingLeft: 14 }]}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Nom"
                    placeholderTextColor="#b0b5c0"
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="next"
                    editable={!isLoading}
                    onFocus={() => setLastNameFocused(true)}
                    onBlur={() => setLastNameFocused(false)}
                    onSubmitEditing={() => emailRef.current?.focus()}
                    accessibilityLabel="Nom"
                  />
                </View>
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputWrapper, emailFocused && styles.inputWrapperFocused]}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={emailFocused ? BRAND : '#9ca3af'}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={emailRef}
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
              <View style={[styles.inputWrapper, passwordFocused && styles.inputWrapperFocused]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={passwordFocused ? BRAND : '#9ca3af'}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, { paddingRight: 48 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Minimum 8 caractères"
                  placeholderTextColor="#b0b5c0"
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  returnKeyType="next"
                  editable={!isLoading}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  accessibilityLabel="Mot de passe"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Masquer' : 'Afficher'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>
              {/* Password Strength */}
              {password.length > 0 && (
                <View style={styles.strengthRow}>
                  <View style={styles.strengthBars}>
                    {[1, 2, 3].map((level) => (
                      <View
                        key={level}
                        style={[
                          styles.strengthBar,
                          { backgroundColor: passwordStrength >= level ? strengthColors[passwordStrength] : '#e5e7eb' },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.strengthText, { color: strengthColors[passwordStrength] }]}>
                    {strengthLabels[passwordStrength]}
                  </Text>
                </View>
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmer</Text>
              <View style={[styles.inputWrapper, confirmFocused && styles.inputWrapperFocused]}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={confirmFocused ? BRAND : '#9ca3af'}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={confirmRef}
                  style={[styles.input, { paddingRight: 48 }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repetez le mot de passe"
                  placeholderTextColor="#b0b5c0"
                  secureTextEntry={!showConfirm}
                  autoComplete="new-password"
                  returnKeyType="done"
                  onSubmitEditing={handleSignUp}
                  editable={!isLoading}
                  onFocus={() => setConfirmFocused(true)}
                  onBlur={() => setConfirmFocused(false)}
                  accessibilityLabel="Confirmer le mot de passe"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm(!showConfirm)}
                  style={styles.eyeButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={showConfirm ? 'Masquer' : 'Afficher'}
                >
                  <Ionicons
                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={14} color="#ef4444" />
                  <Text style={styles.errorText}>Les mots de passe ne correspondent pas</Text>
                </View>
              )}
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={[styles.ctaButton, isLoading && styles.ctaButtonDisabled]}
              onPress={handleSignUp}
              disabled={isLoading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Creer mon compte"
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <View style={styles.ctaInner}>
                  <Text style={styles.ctaText}>Creer mon compte</Text>
                  <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>

            {/* Already have account */}
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.loginLink}
              disabled={isLoading}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Deja un compte, se connecter"
            >
              <Text style={styles.loginLinkText}>
                Deja un compte ?{' '}
                <Text style={styles.loginLinkBold}>Se connecter</Text>
              </Text>
            </TouchableOpacity>

            {/* Legal */}
            <Text style={styles.legal}>
              En creant un compte, vous acceptez nos{' '}
              <Text style={styles.legalLink}>CGU</Text>
              {' '}et notre{' '}
              <Text style={styles.legalLink}>Politique de confidentialite</Text>.
            </Text>
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
    marginBottom: 20,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
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
    paddingTop: 28,
    paddingBottom: 32,
    marginTop: -20,
  },

  /* ── Inputs ── */
  nameRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  nameField: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
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
      android: { elevation: 2 },
    }),
  },
  inputIcon: {
    marginLeft: 14,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 15,
    color: '#111827',
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── Password Strength ── */
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* ── Error ── */
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
  },

  /* ── CTA ── */
  ctaButton: {
    backgroundColor: BRAND,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    ...Platform.select({
      ios: {
        shadowColor: BRAND,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
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
  loginLink: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loginLinkBold: {
    color: BRAND,
    fontWeight: '700',
  },

  /* ── Legal ── */
  legal: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 17,
  },
  legalLink: {
    color: BRAND,
    fontWeight: '600',
  },
});
