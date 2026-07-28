import React, { useEffect } from 'react';
import { Platform, TouchableOpacity, View, Linking } from 'react-native';
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
import { getMixpanel } from '@/lib/mixpanel';

// Sentry is lazy-loaded via dynamic require to prevent crash on iPad
// if the native module has compatibility issues at launch.
let Sentry: any = null;
try {
  Sentry = require('@sentry/react-native');
  const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      enabled: !__DEV__,
      tracesSampleRate: 0.2,
      sendDefaultPii: false,
      debug: false,
    });
  }
} catch {
  // Sentry load/init failed — app continues without crash reporting
  Sentry = null;
}

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

  // Initialize Mixpanel (non-blocking, wrapped in try-catch)
  useEffect(() => {
    try { getMixpanel(); } catch { /* analytics init failed — non-critical */ }
  }, []);

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

  // Deep link de réinitialisation de mot de passe (kshare://reset-password#...).
  // Supabase renvoie les tokens dans le fragment de l'URL : on ouvre la session
  // de récupération et on route vers l'écran de définition du nouveau mot de passe.
  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url || !url.includes('reset-password')) return;

      // Supabase transmet le jeton de récupération sous plusieurs formes selon
      // la configuration : ?token_hash=xxx&type=recovery, ?code=xxx (PKCE) ou
      // #access_token=xxx (implicite). On lit query ET fragment.
      const params: Record<string, string> = {};
      [url.split('?')[1]?.split('#')[0], url.split('#')[1]].forEach((part) => {
        if (!part) return;
        part.split('&').forEach((kv) => {
          const [k, v] = kv.split('=');
          if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
        });
      });

      try {
        if (params.token_hash) {
          await supabase.auth.verifyOtp({
            token_hash: params.token_hash,
            type: (params.type ?? 'recovery') as 'recovery',
          });
        } else if (params.access_token) {
          await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token ?? '',
          });
        } else if (params.code) {
          await supabase.auth.exchangeCodeForSession(params.code);
        } else {
          return;
        }
      } catch {
        // Lien invalide/expiré — l'écran affichera l'erreur au moment de valider
      }

      router.replace('/(auth)/reset-password');
    };

    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', (e) => handleUrl(e.url));
    return () => sub.remove();
  }, []);

  const appContent = (
    <View style={{ flex: 1, backgroundColor: '#ECEEF4' }}>
      <StatusBar style="dark" backgroundColor="#ECEEF4" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#ECEEF4' } }}>
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

function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StripeWrapper>
        <RootLayoutInner />
      </StripeWrapper>
    </QueryClientProvider>
  );
}

// Wrap with Sentry safely — if Sentry native module isn't linked, fall back to unwrapped
let ExportedLayout: React.ComponentType;
try {
  ExportedLayout = Sentry?.wrap ? Sentry.wrap(RootLayout) : RootLayout;
} catch {
  ExportedLayout = RootLayout;
}
export default ExportedLayout;
