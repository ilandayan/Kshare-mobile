import { Mixpanel } from 'mixpanel-react-native';
import { Platform } from 'react-native';

// ── Mixpanel singleton ──────────────────────────────────────────────
const MIXPANEL_TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN ?? '';

let _mixpanel: Mixpanel | null = null;
let _initialized = false;

/**
 * Returns the shared Mixpanel instance.
 * Lazily initialised on first call; safe to call multiple times.
 */
export async function getMixpanel(): Promise<Mixpanel | null> {
  if (!MIXPANEL_TOKEN) return null;

  if (!_mixpanel) {
    _mixpanel = new Mixpanel(MIXPANEL_TOKEN, true);  // trackAutomaticEvents = true
  }

  if (!_initialized) {
    try {
      await _mixpanel.init();
      _initialized = true;
    } catch {
      // Silently fail — analytics should never break the app
      return null;
    }
  }

  return _mixpanel;
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
