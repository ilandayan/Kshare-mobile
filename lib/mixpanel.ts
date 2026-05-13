import { Platform } from 'react-native';

// ── Mixpanel singleton (lazy-loaded to prevent iPad crash at module load) ──
const MIXPANEL_TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN ?? '';

// Use `any` to avoid statically importing the native module type.
// The native module is only loaded at runtime via require() inside getMixpanel().
let _mixpanel: any = null;
let _initialized = false;
let _loadFailed = false;

/**
 * Returns the shared Mixpanel instance.
 * Lazily initialised on first call; safe to call multiple times.
 * The native module is loaded dynamically to prevent crashes on devices
 * where mixpanel-react-native has compatibility issues (e.g. some iPads).
 */
export async function getMixpanel(): Promise<any> {
  if (_loadFailed) return null;
  if (!MIXPANEL_TOKEN) return null;
  // Avoid Mixpanel init on web (can crash Hermes on some devices)
  if (Platform.OS === 'web') return null;
  // Skip in Expo Go dev client — no persistent storage available
  if (__DEV__) return null;

  try {
    if (!_mixpanel) {
      // Dynamic require — only loads the native module when actually needed
      const { Mixpanel } = require('mixpanel-react-native');
      _mixpanel = new Mixpanel(MIXPANEL_TOKEN, true); // trackAutomaticEvents = true
    }

    if (!_initialized) {
      await _mixpanel.init();
      _initialized = true;
    }

    return _mixpanel;
  } catch {
    // Silently fail — analytics should never break the app
    _mixpanel = null;
    _loadFailed = true;
    return null;
  }
}

// ── Event names (single source of truth) ────────────────────────────
export const MixpanelEvents = {
  // Auth
  SIGN_UP: 'sign_up',
  LOGIN: 'login',
  LOGOUT: 'logout',

  // Navigation
  VIEW_HOME: 'view_home',
  VIEW_SEARCH: 'view_search',
  VIEW_MAP: 'view_map',
  VIEW_FAVORITES: 'view_favorites',
  VIEW_ORDERS: 'view_orders',
  VIEW_PROFILE: 'view_profile',

  // Basket flow
  VIEW_BASKET: 'view_basket',
  RESERVE_BASKET: 'reserve_basket',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',

  // Commerce
  VIEW_COMMERCE: 'view_commerce',
  TOGGLE_FAVORITE: 'toggle_favorite',

  // Search
  SEARCH: 'search',

  // Support
  CONTACT_SUPPORT: 'contact_support',
  REPORT_ORDER: 'report_order',
} as const;

// ── Helper functions ────────────────────────────────────────────────

/**
 * Track an event with optional properties.
 * Non-blocking, never throws.
 */
export async function trackEvent(
  event: string,
  properties?: Record<string, string | number | boolean>,
): Promise<void> {
  try {
    const mp = await getMixpanel();
    if (!mp) return;

    mp.track(event, {
      platform: Platform.OS,
      ...properties,
    });
  } catch {
    // Never let analytics break the app
  }
}

/**
 * Identify user after login/signup.
 * Sets user profile properties for segmentation.
 */
export async function identifyUser(
  userId: string,
  traits?: { name?: string; email?: string; role?: string },
): Promise<void> {
  try {
    const mp = await getMixpanel();
    if (!mp) return;

    mp.identify(userId);

    if (traits?.name) {
      mp.getPeople().set('$name', traits.name);
    }
    if (traits?.email) {
      mp.getPeople().set('$email', traits.email);
    }
    if (traits?.role) {
      mp.getPeople().set('role', traits.role);
    }
    mp.getPeople().set('platform', Platform.OS);
  } catch {
    // Non-blocking
  }
}

/**
 * Reset Mixpanel identity on logout.
 */
export async function resetMixpanel(): Promise<void> {
  try {
    const mp = await getMixpanel();
    if (!mp) return;
    mp.reset();
  } catch {
    // Non-blocking
  }
}
