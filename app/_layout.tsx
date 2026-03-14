import React, { useEffect } from 'react';
import { Platform, TouchableOpacity, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaProvider,
  SafeAreaInsetsContext,
  SafeAreaFrameContext,
} from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { StripeWrapper } from '@/components/StripeWrapper';
import { DeviceFrame } from '@/components/DeviceFrame';
import { usePushNotifications } from '@/lib/usePushNotifications';

// On web inside DeviceFrame, force iPhone 16 Pro safe area insets.
// We provide these via context directly because SafeAreaProvider's
// initialMetrics get overridden by the browser measurement (CSS
// env(safe-area-inset-*) returns 0 in a regular browser window).
const WEB_INSETS = { top: 59, bottom: 0, left: 0, right: 0 };
const WEB_FRAME = { x: 0, y: 0, width: 393, height: 852 };

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
    },
  },
});

function RootLayoutInner() {
  const { setSession, setLoading } = useAppStore();

  // Register push notifications (physical devices only)
  usePushNotifications();

  const { setUserRole } = useAppStore();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      // Fetch user role
      if (session?.user) {
        supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.role) setUserRole(data.role);
          });
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
      if (session?.user) {
        supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.role) setUserRole(data.role);
          });
      } else {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, setLoading, setUserRole]);

  const appContent = (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#ffffff' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(asso-tabs)" />
        <Stack.Screen
          name="panier/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Détail du panier',
            headerBackTitle: 'Retour',
            headerTintColor: '#3744C8',
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
            headerTintColor: '#3744C8',
            headerStyle: { backgroundColor: '#ffffff' },
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/(tabs)/paniers');
                  }
                }}
                style={{ paddingRight: 8 }}
              >
                <Ionicons name="chevron-back" size={24} color="#3744C8" />
              </TouchableOpacity>
            ),
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="profil/edit"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="profil/support"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
      </Stack>
    </View>
  );

  return (
    <DeviceFrame>
      {Platform.OS === 'web' ? (
        // On web, directly provide fixed safe-area contexts so that
        // SafeAreaView and useSafeAreaInsets work correctly inside
        // the DeviceFrame (simulated iPhone 16 Pro).
        <SafeAreaFrameContext.Provider value={WEB_FRAME}>
          <SafeAreaInsetsContext.Provider value={WEB_INSETS}>
            {appContent}
          </SafeAreaInsetsContext.Provider>
        </SafeAreaFrameContext.Provider>
      ) : (
        <SafeAreaProvider>{appContent}</SafeAreaProvider>
      )}
    </DeviceFrame>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StripeWrapper>
        <RootLayoutInner />
      </StripeWrapper>
    </QueryClientProvider>
  );
}
