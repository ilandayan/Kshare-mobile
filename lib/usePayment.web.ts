import { Alert } from 'react-native';

// Web: payment not supported — Stripe native SDK only
export function usePayment() {
  const pay = async (_options: {
    basketId: string;
    userId: string;
    userEmail: string;
    amount: number;
    quantity?: number;
    isDonation?: boolean;
  }): Promise<{ success: boolean; orderId?: string }> => {
    Alert.alert(
      'Paiement mobile uniquement',
      "Le paiement est disponible uniquement sur l'application mobile iOS/Android. Veuillez télécharger l'app ou utiliser la webapp k-share.fr.",
    );
    return { success: false };
  };

  return { pay };
}
