import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({
  title = 'Une erreur est survenue',
  message = 'Veuillez réessayer dans quelques instants.',
  onRetry,
  compact = false,
}: ErrorStateProps) {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.iconWrap}>
        <Ionicons name="alert-circle-outline" size={compact ? 36 : 48} color="#EF4444" />
      </View>
      <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
      <Text style={[styles.message, compact && styles.messageCompact]}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
          <Ionicons name="refresh-outline" size={16} color="#3744C8" />
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Pas de connexion"
      message="Vérifiez votre connexion internet et reessayez."
      onRetry={onRetry}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  containerCompact: {
    paddingVertical: 24,
  },
  iconWrap: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 14,
  },
  message: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
    lineHeight: 18,
  },
  messageCompact: {
    fontSize: 12,
  },
  retryButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
  },
  retryText: {
    color: '#3744C8',
    fontSize: 14,
    fontWeight: '600',
  },
});
