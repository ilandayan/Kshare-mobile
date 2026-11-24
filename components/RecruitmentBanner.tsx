import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePlatformLaunch } from '@/lib/usePlatformLaunch';

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
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name="storefront-outline" size={22} color="#3744C8" />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>Kshare ouvre bientôt</Text>
        <Text style={styles.body}>
          Nous recrutons en ce moment nos commerces casher partenaires : boulangeries,
          pâtisseries, traiteurs. Les premiers paniers arrivent
          {date ? ` le ${date}.` : ' très bientôt.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#EEF0FC',
    borderWidth: 1,
    borderColor: '#D5D9F6',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: '#1E2A78', marginBottom: 3 },
  body: { fontSize: 13, lineHeight: 18, color: '#374151' },
});
