export type BasketType = 'bassari' | 'halavi' | 'parve' | 'shabbat' | 'mix';
export type BasketStatus = 'draft' | 'published' | 'sold_out' | 'expired' | 'disabled';
export type UserRole = 'client' | 'commerce' | 'association' | 'admin';

export const BASKET_TYPE_LABELS: Record<
  BasketType,
  { emoji: string; label: string; color: string; bgColor: string }
> = {
  bassari: { emoji: '🥩', label: 'Bassari', color: '#ef4444', bgColor: '#fef2f2' },
  halavi: { emoji: '🧀', label: 'Halavi', color: '#f59e0b', bgColor: '#fffbeb' },
  parve: { emoji: '🌿', label: 'Parvé', color: '#22c55e', bgColor: '#f0fdf4' },
  shabbat: { emoji: '🍷', label: 'Shabbat', color: '#8b5cf6', bgColor: '#f5f3ff' },
  mix: { emoji: '➕', label: 'Mix', color: '#3b82f6', bgColor: '#eff6ff' },
};

export interface Commerce {
  id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string | null;
  logo_url: string | null;
  hashgakha: string;
  latitude: number | null;
  longitude: number | null;
}

export interface Basket {
  id: string;
  type: BasketType;
  day: 'today' | 'tomorrow';
  description: string | null;
  original_price: number;
  sold_price: number;
  quantity_total: number;
  quantity_reserved: number;
  quantity_sold: number;
  status: BasketStatus;
  is_donation: boolean;
  pickup_start: string;
  pickup_end: string;
  created_at: string;
  commerce_id: string;
  commerces: Commerce | null;
}

export interface Order {
  id: string;
  basket_id: string;
  user_id: string;
  amount_paid: number;
  status: 'pending' | 'confirmed' | 'picked_up' | 'cancelled' | 'refunded';
  qr_code_token: string | null;
  created_at: string;
  baskets: {
    type: BasketType;
    pickup_start: string;
    pickup_end: string;
    description: string | null;
    commerces: {
      name: string;
      address: string;
      city: string;
      postal_code: string | null;
    } | null;
  } | null;
}

export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  basket_id: string;
  created_at: string;
}
