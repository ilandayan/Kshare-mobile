import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StripeProvider } from '@stripe/stripe-react-native';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
    },
  },
});

const STRIPE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

function RootLayoutInner() {
  const { setSession, setLoading } = useAppStore();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setLoading]);

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="panier/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Détail du panier',
            headerBackTitle: 'Retour',
            headerTintColor: '#3b82f6',
            headerStyle: { backgroundColor: '#ffffff' },
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="commande/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Ma commande',
            headerBackTitle: 'Retour',
            headerTintColor: '#3b82f6',
            headerStyle: { backgroundColor: '#ffffff' },
            presentation: 'card',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StripeProvider publishableKey={STRIPE_KEY}>
        <RootLayoutInner />
      </StripeProvider>
    </QueryClientProvider>
  );
}
