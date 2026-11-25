import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { usePlatformLaunch } from '@/lib/usePlatformLaunch';
import { devenirPartenaire, recommanderUnCommerce } from '@/lib/partnerLinks';

function formatLaunchDate(isoDate: string): string | null {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return null;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

/**
 * Prévient que Kshare recrute ses commerces avant l'ouverture. Visible tant
 * que la plateforme n'est pas lancée ; disparaît d'elle-même le jour du
 * lancement fixé dans l'espace admin.
 */
export function RecruitmentBanner() {
  const { data } = usePlatformLaunch();
  if (!data || data.launched) return null;

  const date = data.launchDate ? formatLaunchDate(data.launchDate) : null;

  return (
    <View style={styles.banner} accessibilityRole="summary">
      <Text style={styles.title}>Kshare ouvre bientôt</Text>
      <Text style={styles.body}>
        Nous recrutons en ce moment nos commerces casher partenaires : boulangeries,
        pâtisseries, traiteurs. Les premiers paniers arrivent
        {date ? ` le ${date}.` : ' très bientôt.'}
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={recommanderUnCommerce}
          accessibilityRole="button"
          activeOpacity={0.85}
        >
          <Text style={[styles.buttonText, styles.buttonTextPrimary]}>Recommander un commerce</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={devenirPartenaire}
          accessibilityRole="button"
          activeOpacity={0.85}
        >
          <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Devenir partenaire</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#EEF0FC',
    borderWidth: 1,
    borderColor: '#D5D9F6',
  },
  title: { fontSize: 14, fontWeight: '700', color: '#1E2A78', marginBottom: 3 },
  body: { fontSize: 13, lineHeight: 18, color: '#374151' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  button: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: { backgroundColor: '#3744C8' },
  buttonSecondary: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#C9CEF3' },
  buttonText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  buttonTextPrimary: { color: '#FFFFFF' },
  buttonTextSecondary: { color: '#3744C8' },
});
