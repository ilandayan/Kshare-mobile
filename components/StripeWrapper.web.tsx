import React from 'react';

// On web, Stripe native SDK is not available — just render children
export function StripeWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
