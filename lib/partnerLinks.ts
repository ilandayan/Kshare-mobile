import { openExternalUrl } from '@/lib/linking';

/**
 * Actions partagées entre l'onglet Profil et la bannière de pré-lancement :
 * un seul endroit à changer pour que les deux restent identiques.
 */
export function devenirPartenaire() {
  return openExternalUrl('https://k-share.fr');
}

export function recommanderUnCommerce() {
  return openExternalUrl('mailto:contact@k-share.fr?subject=Recommandation%20commerce');
}
