import { Alert } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from './supabase';

export function usePayment() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const pay = async (options: {
    basketId: string;
    userId: string;
    userEmail: string;
    amount: number;
    quantity?: number;
  }): Promise<{ success: boolean; orderId?: string }> => {
    // Create payment intent via Supabase Edge Function
    const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
      'create-payment-intent',
      {
        body: {
          basket_id: options.basketId,
          user_id: options.userId,
          amount: options.amount,
          quantity: options.quantity ?? 1,
          user_email: options.userEmail,
        },
      },
    );

    if (paymentError || !paymentData?.clientSecret) {
      // Try to extract the detailed error message from the Edge Function response
      const detailedMessage =
        paymentData?.error ??
        paymentError?.message ??
        'Impossible de créer le paiement.';
      throw new Error(detailedMessage);
    }

    const { error: initError } = await initPaymentSheet({
      merchantDisplayName: 'Kshare',
      paymentIntentClientSecret: paymentData.clientSecret,
      defaultBillingDetails: {
        email: options.userEmail,
      },
      appearance: {
        colors: {
          primary: '#3744C8',
        },
      },
    });

    if (initError) {
      throw new Error(initError.message);
    }

    const { error: presentError } = await presentPaymentSheet();

    if (presentError) {
      if (presentError.code !== 'Canceled') {
        Alert.alert('Paiement annulé', presentError.message);
      }
      return { success: false };
    }

    return { success: true, orderId: paymentData.orderId };
  };

  return { pay };
}
