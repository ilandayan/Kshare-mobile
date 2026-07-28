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

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [show, setShow] = useState(false);

  const handleSubmit = async () => {
    if (password.length < 8) {
      Alert.alert('Mot de passe trop court', 'Utilisez au moins 8 caractères.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Les mots de passe ne correspondent pas', 'Veuillez ressaisir.');
      return;
    }

    setIsLoading(true);
    try {
      // Nécessite une session de récupération ouverte via le deep link.
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        // Distinguer les causes : annoncer "lien expiré" alors que
        // l'utilisateur a simplement réutilisé son ancien mot de passe
        // l'envoie corriger le mauvais problème.
        const code = (error as { code?: string }).code ?? '';
        const raw = (error.message ?? '').toLowerCase();

        if (code === 'same_password' || raw.includes('different from the old password')) {
          Alert.alert(
            'Mot de passe identique',
            "Le nouveau mot de passe doit être différent de l'ancien mot de passe.",
          );
        } else if (code === 'weak_password' || raw.includes('weak') || raw.includes('at least')) {
          Alert.alert(
            'Mot de passe trop faible',
            'Utilisez au moins 8 caractères, avec des lettres et des chiffres.',
          );
        } else if (raw.includes('session') || raw.includes('token') || raw.includes('expired')) {
          Alert.alert(
            'Lien expiré',
            "Ce lien de réinitialisation n'est plus valide. Redemandez-en un.",
          );
        } else {
          Alert.alert('Erreur', error.message ?? 'Une erreur est survenue. Veuillez réessayer.');
        }
        return;
      }
      Alert.alert('Mot de passe modifié', 'Vous pouvez maintenant vous connecter.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/connexion') },
      ]);
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
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="key-outline" size={32} color={BRAND} />
            </View>
            <Text style={styles.headerTitle}>Nouveau mot de passe</Text>
            <Text style={styles.headerSubtitle}>
              Choisissez un mot de passe sécurisé, différent de l&apos;ancien
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nouveau mot de passe</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="8 caractères min., différent de l'ancien"
                  placeholderTextColor="#b0b5c0"
                  secureTextEntry={!show}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={() => setShow((s) => !s)} style={styles.eyeBtn} hitSlop={8}>
                  <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmer le mot de passe</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Ressaisissez le mot de passe"
                  placeholderTextColor="#b0b5c0"
                  secureTextEntry={!show}
                  autoCapitalize="none"
                  editable={!isLoading}
                  onSubmitEditing={handleSubmit}
                  returnKeyType="done"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.ctaButton, isLoading && styles.ctaButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.ctaText}>Enregistrer</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace('/(auth)/connexion')}
              style={styles.cancelLink}
              disabled={isLoading}
              hitSlop={8}
            >
              <Text style={styles.cancelLinkText}>Retour à la connexion</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BRAND },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: {
    backgroundColor: BRAND,
    paddingTop: Platform.OS === 'ios' ? 72 : 48,
    paddingBottom: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#ffffff', marginBottom: 6 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    marginTop: -20,
  },
  inputGroup: { marginBottom: 20 },
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
  },
  inputIcon: { marginLeft: 14 },
  eyeBtn: { paddingHorizontal: 14 },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 15 : 13,
    fontSize: 15,
    color: '#111827',
  },
  ctaButton: {
    backgroundColor: BRAND,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  ctaButtonDisabled: { opacity: 0.7 },
  ctaText: { color: '#ffffff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  cancelLink: { alignItems: 'center', paddingVertical: 16 },
  cancelLinkText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
});
