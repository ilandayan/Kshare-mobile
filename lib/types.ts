export type BasketType = 'bassari' | 'halavi' | 'parve' | 'shabbat' | 'mix';
export type BasketStatus = 'draft' | 'published' | 'sold_out' | 'expired' | 'disabled';
export type UserRole = 'client' | 'commerce' | 'association' | 'admin';

export const BASKET_TYPE_LABELS: Record<
  BasketType,
  { emoji: string; label: string; color: string; bgColor: string }
> = {
  bassari: { emoji: '🥩', label: 'Bassari', color: '#D94452', bgColor: '#fef2f2' },
  halavi:  { emoji: '🧀', label: 'Halavi',  color: '#2E8BBE', bgColor: '#eff6ff' },
  parve:   { emoji: '🌿', label: 'Parvé',   color: '#2A9D6E', bgColor: '#f0fdf4' },
  shabbat: { emoji: '🍷', label: 'Shabbat', color: '#D97B1A', bgColor: '#fffbeb' },
  mix:     { emoji: '➕', label: 'Mix',     color: '#7B5CC0', bgColor: '#f5f3ff' },
};

export interface Commerce {
  id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string | null;
  logo_url: string | null;
  photos: string[] | null;
  hashgakha: string;
  commerce_type: string | null;
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

export type OrderStatus = "created" | "paid" | "ready_for_pickup" | "picked_up" | "no_show" | "refunded" | "cancelled_admin";

export interface Order {
  id: string;
  basket_id: string;
  client_id: string;
  commerce_id: string;
  total_amount: number;
  quantity: number;
  unit_price: number;
  status: OrderStatus;
  is_donation: boolean;
  qr_code_token: string | null;
  pickup_date: string | null;
  pickup_start: string | null;
  pickup_end: string | null;
  created_at: string;
  baskets: {
    type: BasketType;
    pickup_start: string;
    pickup_end: string;
    original_price: number;
    sold_price: number;
    description: string | null;
    is_donation: boolean;
    commerces: {
      name: string;
      address: string;
      city: string;
      postal_code: string | null;
      logo_url: string | null;
      commerce_type: string | null;
    } | null;
  } | null;
  associations: {
    name: string;
  } | null;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Favorite {
  id: string;
  client_id: string;
  commerce_id: string;
  created_at: string;
}
