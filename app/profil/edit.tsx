import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';

type FieldKey = 'firstName' | 'lastName' | 'email' | 'phone';

const FIELD_CONFIG: Record<FieldKey, {
  title: string;
  label: string;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  autoCorrect?: boolean;
}> = {
  firstName: {
    title: 'Prénom',
    label: 'Prénom',
    placeholder: 'Votre prénom',
    autoCapitalize: 'words',
  },
  lastName: {
    title: 'Nom',
    label: 'Nom',
    placeholder: 'Votre nom',
    autoCapitalize: 'words',
  },
  email: {
    title: 'Email',
    label: 'Adresse email',
    placeholder: 'votre@email.com',
    keyboardType: 'email-address',
    autoCapitalize: 'none',
    autoCorrect: false,
  },
  phone: {
    title: 'Téléphone',
    label: 'Numéro de téléphone',
    placeholder: '06 12 34 56 78',
    keyboardType: 'phone-pad',
  },
};

export default function EditProfilePage() {
  const { user } = useAppStore();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ field?: string }>();

  // Field demandé via query param. Fallback sur firstName si absent/invalide.
  const fieldKey: FieldKey =
    params.field && (params.field in FIELD_CONFIG)
      ? (params.field as FieldKey)
      : 'firstName';
  const config = FIELD_CONFIG[fieldKey];

  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Charge la valeur actuelle du champ
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    if (fieldKey === 'email') {
      setValue(user.email ?? '');
      setLoading(false);
      return;
    }

    supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          if (fieldKey === 'firstName') {
            const parts = (data.full_name ?? '').trim().split(/\s+/);
            setValue(parts[0] ?? '');
          } else if (fieldKey === 'lastName') {
            const parts = (data.full_name ?? '').trim().split(/\s+/);
            setValue(parts.slice(1).join(' '));
          } else if (fieldKey === 'phone') {
            setValue(data.phone ?? '');
          }
        }
        setLoading(false);
      });
  }, [user?.id, fieldKey]);

  const handleSave = async () => {
    if (!user?.id) {
      Alert.alert('Non connecté', 'Vous devez être connecté pour modifier votre profil.');
      return;
    }

    const trimmed = value.trim();
    setSaving(true);

    try {
      if (fieldKey === 'email') {
        if (!trimmed) {
          Alert.alert('Email requis', 'Veuillez saisir une adresse email.');
          setSaving(false);
          return;
        }
        if (trimmed === user.email) {
          // Aucun changement
          router.back();
          setSaving(false);
          return;
        }
        const { error } = await supabase.auth.updateUser({ email: trimmed });
        if (error) {
          Alert.alert('Erreur', error.message);
          setSaving(false);
          return;
        }
        Alert.alert(
          'Email mis à jour',
          'Un email de confirmation a été envoyé à votre nouvelle adresse.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
        setSaving(false);
        return;
      }

      if (fieldKey === 'phone') {
        const { error } = await supabase
          .from('profiles')
          .update({ phone: trimmed || null })
          .eq('id', user.id);
        if (error) {
          Alert.alert('Erreur', 'Impossible de mettre à jour le téléphone.');
          setSaving(false);
          return;
        }
      } else {
        // firstName ou lastName : on recompose le full_name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        const currentParts = (profile?.full_name ?? '').trim().split(/\s+/).filter(Boolean);
        let newFirstName = currentParts[0] ?? '';
        let newLastName = currentParts.slice(1).join(' ');

        if (fieldKey === 'firstName') newFirstName = trimmed;
        else newLastName = trimmed;

        const fullName = [newFirstName, newLastName].filter(Boolean).join(' ').trim();

        const { error } = await supabase
          .from('profiles')
          .update({ full_name: fullName || null })
          .eq('id', user.id);
        if (error) {
          Alert.alert('Erreur', 'Impossible de mettre à jour votre profil.');
          setSaving(false);
          return;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#3744C8" />
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
          <Text style={styles.headerTitle}>{config.title}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: '#ECEEF4' }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.field}>
            <Text style={styles.label}>{config.label}</Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={setValue}
              placeholder={config.placeholder}
              placeholderTextColor="#9CA3AF"
              keyboardType={config.keyboardType ?? 'default'}
              autoCapitalize={config.autoCapitalize ?? 'sentences'}
              autoCorrect={config.autoCorrect ?? true}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Enregistrer</Text>
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
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: 20,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
  },
  saveBtn: {
    backgroundColor: '#3744C8',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
