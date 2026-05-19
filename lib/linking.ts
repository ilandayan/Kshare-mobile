import { Alert, Linking } from 'react-native';

/**
 * Ouvre une URL externe en gérant proprement les cas où aucune app
 * n'est disponible (ex: pas de client mail, pas d'app téléphone).
 * Affiche un Alert avec l'info brute en fallback.
 */
export async function openExternalUrl(url: string): Promise<void> {
  try {
    const can = await Linking.canOpenURL(url);
    if (can) {
      await Linking.openURL(url);
      return;
    }
    showFallback(url);
  } catch (_err) {
    showFallback(url);
  }
}

function showFallback(url: string): void {
  if (url.startsWith('mailto:')) {
    const email = url.replace(/^mailto:/, '').split('?')[0];
    Alert.alert(
      'Aucune application mail',
      `Aucune application de messagerie n'est configurée sur cet appareil.\n\nÉcrivez-nous à :\n${email}`,
      [{ text: 'OK' }],
    );
  } else if (url.startsWith('tel:')) {
    const tel = url.replace(/^tel:/, '');
    Alert.alert(
      'Aucune application téléphone',
      `Numéro à composer :\n${tel}`,
      [{ text: 'OK' }],
    );
  } else {
    Alert.alert("Impossible d'ouvrir le lien", url, [{ text: 'OK' }]);
  }
}
