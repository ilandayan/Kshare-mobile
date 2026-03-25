import React from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';

const STRIPE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

export function StripeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <StripeProvider
      publishableKey={STRIPE_KEY}
      merchantIdentifier="merchant.fr.kshare.app"
      urlScheme="kshare"
      setReturnUrlSchemeOnAndroid
    >
      {children}
    </StripeProvider>
  );
}
