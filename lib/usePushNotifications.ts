import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { supabase } from './supabase';
import { useAppStore } from './store';

// Configure how notifications are displayed when app is in foreground
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // Notification handler setup failed — notifications will still work but won't show in foreground
}

async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    // console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    // console.log('Push notification permission not granted');
    return null;
  }

  // Android: set notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Kshare',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3744C8',
    });
  }

  // Get the Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  return tokenData.data;
}

async function savePushToken(token: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  // Upsert: insert or update if token already exists
  await supabase
    .from('push_tokens')
    .upsert(
      {
        profile_id: user.id,
        token,
        platform,
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id,token' }
    );
}

/**
 * Hook to register for push notifications and save the token.
 * Call this in the main app layout once the user is authenticated.
 */
export function usePushNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    // Register and save token
    registerForPushNotifications().then((token) => {
      if (token) {
        savePushToken(token);
      }
    });

    // Listen for incoming notifications (foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        // Could update badge count, show in-app toast, etc.
        // console.log('Notification received:', notification.request.content.title);
      }
    );

    // Listen for notification tap (opens app) → navigate to order
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.type === 'new_basket') {
          // New basket notification → go to search/browse
          router.push('/(tabs)/rechercher');
        } else if (data?.orderId) {
          const userRole = useAppStore.getState().userRole;
          if (userRole === 'association') {
            // Associations go to their reservations tab
            router.push('/(asso-tabs)/reservations');
          } else {
            // Clients go to order detail
            router.push(`/commande/${data.orderId}`);
          }
        }
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);
}
