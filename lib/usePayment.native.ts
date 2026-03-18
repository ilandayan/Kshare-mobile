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
    isDonation?: boolean;
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
          is_donation: options.isDonation ?? false,
        },
      },
    );

    if (paymentError || !paymentData?.clientSecret || !paymentData?.ephemeralKey || !paymentData?.customerId || !paymentData?.orderId) {
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
      customerEphemeralKeySecret: paymentData.ephemeralKey,
      customerId: paymentData.customerId,
      defaultBillingDetails: {
        email: options.userEmail,
      },
      // Google Pay (Apple Pay requires merchant ID from Apple Developer account)
      googlePay: {
        merchantCountryCode: 'FR',
        testEnv: true,
      },
      // Required for redirect-based payment methods
      returnURL: 'kshare://stripe-redirect',
      // Allow saving cards for future payments
      allowsDelayedPaymentMethods: false,
      // French locale
      primaryButtonLabel: 'Payer',
      locale: 'fr-FR',
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

    // Payment succeeded — update order status to 'paid'
    try {
      await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', paymentData.orderId);
    } catch (updateErr) {
      // Non-blocking: webhook will also update the status server-side
      // Non-critical: webhook handles status update server-side
    }

    return { success: true, orderId: paymentData.orderId };
  };

  return { pay };
}
