import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { SacKshare } from '@/components/SacKshare';

/**
 * Écran de remerciement.
 *
 * Deux moments, pas un seul. Pour un achat il s'affiche après la confirmation
 * de retrait, quand le panier est réellement sauvé — au paiement, rien ne l'est
 * encore, le client peut ne jamais venir. Pour un don il s'affiche au paiement,
 * parce que le donateur n'a pas de retrait : c'est l'association qui vient
 * chercher le panier.
 */
export default function MerciScreen() {
  const { type, premier } = useLocalSearchParams<{
    type?: string;
    premier?: string;
  }>();

  const estDon = type === 'don';

  // « Encore » suppose un panier précédent. À la toute première commande, la
  // phrase sonne faux — c'est justement le jour où l'on veut le mieux recevoir
  // le client.
  const sousTitreAchat =
    premier === '1' ? 'Un panier casher sauvé' : 'Encore un panier casher sauvé';

  const handleContinuer = () => {
    if (estDon) {
      router.replace('/(tabs)/paniers');
      return;
    }
    // Retour à la fiche de commande, où la notation attend le client.
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/paniers');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.corps}>
        {estDon ? (
          <>
            <Text style={[styles.titre, styles.titreDon]}>
              Votre mitzva est en route !
            </Text>
            <Text style={styles.sous}>
              Ce panier sera remis à une association partenaire.{'\n'}
              Merci de votre générosité.
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.titre, styles.titreAchat]}>Merci !</Text>
            <Text style={styles.sous} numberOfLines={1} adjustsFontSizeToFit>
              {sousTitreAchat}
            </Text>
          </>
        )}

        <View style={styles.sac}>
          <SacKshare variante={estDon ? 'don' : 'achat'} largeur={216} />
        </View>
      </View>

      <TouchableOpacity
        onPress={handleContinuer}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <LinearGradient
          colors={estDon ? ['#6A4FE0', '#9B7BF7'] : ['#3744C8', '#5B6EF5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bouton}
        >
          <Text style={styles.boutonTexte}>
            {estDon ? 'Voir mes dons' : 'Continuer'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBFCFF',
    paddingHorizontal: 26,
    paddingBottom: 26,
  },
  corps: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  titre: {
    fontWeight: '800',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  titreAchat: {
    fontSize: 52,
    lineHeight: 58,
    color: '#1e2a78',
  },
  titreDon: {
    fontSize: 34,
    lineHeight: 40,
    color: '#3B2E96',
  },
  sous: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6b7280',
    textAlign: 'center',
  },
  sac: {
    marginTop: 16,
  },
  bouton: {
    height: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boutonTexte: {
    color: '#ffffff',
    fontSize: 16.5,
    fontWeight: '700',
  },
});
