import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

interface RatingModalProps {
  orderId: string;
  commerceId: string;
  commerceName: string;
  onSubmit: () => void;
  onSkip: () => void;
}

export function RatingModal({ orderId, commerceId, commerceName, onSubmit, onSkip }: RatingModalProps) {
  const [selectedScore, setSelectedScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmitRating = async () => {
    if (selectedScore < 1) return;
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Erreur', 'Vous devez être connecté pour noter.');
        setSubmitting(false);
        return;
      }

      const { error } = await supabase.from('ratings').insert({
        order_id: orderId,
        client_id: user.id,
        commerce_id: commerceId,
        score: selectedScore,
      });

      if (error) {
        if (error.code === '23505') {
          // Unique constraint — already rated
          Alert.alert('Déjà noté', 'Vous avez déjà noté cette commande.');
        } else {
          Alert.alert('Erreur', 'Impossible d\'envoyer votre note.');
        }
        setSubmitting(false);
        return;
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });

      onSubmit();
    } catch {
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.emojiCircle}>
        <Text style={styles.emoji}>
          {selectedScore === 0 ? '⭐' : selectedScore <= 2 ? '😕' : selectedScore <= 3 ? '🙂' : selectedScore <= 4 ? '😊' : '🤩'}
        </Text>
      </View>

      <Text style={styles.title}>Notez votre expérience</Text>
      <Text style={styles.subtitle}>
        Comment s'est passé votre retrait chez{'\n'}
        <Text style={styles.commerceNameText}>{commerceName}</Text> ?
      </Text>

      {/* Stars */}
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((score) => (
          <TouchableOpacity
            key={score}
            onPress={() => setSelectedScore(score)}
            activeOpacity={0.7}
            style={styles.starBtn}
          >
            <Ionicons
              name={score <= selectedScore ? 'star' : 'star-outline'}
              size={40}
              color={score <= selectedScore ? '#F59E0B' : '#D1D5DB'}
            />
          </TouchableOpacity>
        ))}
      </View>

      {selectedScore > 0 && (
        <Text style={styles.scoreLabel}>
          {selectedScore === 1 ? 'Pas satisfait' :
           selectedScore === 2 ? 'Moyen' :
           selectedScore === 3 ? 'Correct' :
           selectedScore === 4 ? 'Très bien' : 'Excellent !'}
        </Text>
      )}

      {/* Submit button */}
      <TouchableOpacity
        style={[styles.submitBtn, selectedScore === 0 && styles.submitBtnDisabled]}
        onPress={handleSubmitRating}
        disabled={selectedScore === 0 || submitting}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.submitBtnText}>Envoyer ma note</Text>
        )}
      </TouchableOpacity>

      {/* Skip button */}
      <TouchableOpacity
        style={styles.skipBtn}
        onPress={onSkip}
        activeOpacity={0.7}
      >
        <Text style={styles.skipBtnText}>Ignorer</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  emojiCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emoji: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  commerceNameText: {
    fontWeight: '700',
    color: '#3744C8',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  starBtn: {
    padding: 4,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 4,
  },
  submitBtn: {
    backgroundColor: '#3744C8',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
});
