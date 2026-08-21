import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { openExternalUrl } from '@/lib/linking';

const URL_ESPACE_ASSO = 'https://k-share.fr/asso/paniers-dons';

/**
 * Ce que voit une association qui se connecte depuis l'application.
 *
 * L'espace association vit sur le site, pas ici : c'est là que se trouvent les
 * paniers dons du rayon, les réservations et le profil. L'application mobile en
 * proposait une seconde version, que personne n'ouvrait et qui avait fini par
 * diverger de celle du web — filtre départemental d'un côté, rayon de 50 km de
 * l'autre. Deux interfaces pour un même métier finissent toujours ainsi.
 *
 * Plutôt qu'un écran d'erreur, on renvoie vers le bon endroit.
 */
export default function EspaceAssociationScreen() {
  async function seDeconnecter() {
    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.corps}>
        <View style={styles.rond}>
          <Ionicons name="globe-outline" size={34} color="#6A4FE0" />
        </View>

        <Text style={styles.titre}>Votre espace est sur le site</Text>

        <Text style={styles.texte}>
          Les paniers dons proposés près de chez vous, vos réservations et votre
          profil se trouvent sur k-share.fr. Connectez-vous avec les mêmes
          identifiants.
        </Text>

        <TouchableOpacity
          onPress={() => openExternalUrl(URL_ESPACE_ASSO)}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={['#6A4FE0', '#9B7BF7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bouton}
          >
            <Text style={styles.boutonTexte}>Ouvrir mon espace</Text>
            <Ionicons name="open-outline" size={17} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={seDeconnecter} accessibilityRole="button">
          <Text style={styles.deconnexion}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFCFF', paddingHorizontal: 30 },
  corps: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  rond: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F0ECFD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  titre: {
    fontSize: 23,
    fontWeight: '800',
    color: '#3B2E96',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  texte: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 10,
  },
  bouton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    paddingHorizontal: 28,
    borderRadius: 999,
  },
  boutonTexte: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  deconnexion: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
});
