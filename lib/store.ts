import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
}

interface FavoritesState {
  favorites: string[];
  addFavorite: (basketId: string) => void;
  removeFavorite: (basketId: string) => void;
  toggleFavorite: (basketId: string) => void;
  setFavorites: (basketIds: string[]) => void;
  isFavorite: (basketId: string) => boolean;
}

interface AppStore extends AuthState, FavoritesState {}

export const useAppStore = create<AppStore>((set, get) => ({
  // Auth state
  user: null,
  session: null,
  isLoading: true,

  setSession: (session: Session | null) => {
    set({ session, user: session?.user ?? null });
  },

  setUser: (user: User | null) => {
    set({ user });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, favorites: [] });
  },

  // Favorites state
  favorites: [],

  addFavorite: (basketId: string) => {
    const current = get().favorites;
    if (!current.includes(basketId)) {
      set({ favorites: [...current, basketId] });
    }
  },

  removeFavorite: (basketId: string) => {
    set({ favorites: get().favorites.filter((id) => id !== basketId) });
  },

  toggleFavorite: (basketId: string) => {
    const current = get().favorites;
    if (current.includes(basketId)) {
      set({ favorites: current.filter((id) => id !== basketId) });
    } else {
      set({ favorites: [...current, basketId] });
    }
  },

  setFavorites: (basketIds: string[]) => {
    set({ favorites: basketIds });
  },

  isFavorite: (basketId: string) => {
    return get().favorites.includes(basketId);
  },
}));
