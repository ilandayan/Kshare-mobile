import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { supabase } from './supabase';

import type { UserRole } from './types';

interface AuthState {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setUserRole: (role: UserRole | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
}

interface FavoritesState {
  /** Commerce IDs the user has favorited */
  favorites: string[];
  addFavorite: (commerceId: string) => void;
  removeFavorite: (commerceId: string) => void;
  toggleFavorite: (commerceId: string) => Promise<void>;
  setFavorites: (commerceIds: string[]) => void;
  isFavorite: (commerceId: string) => boolean;
}

interface AppStore extends AuthState, FavoritesState {}

export const useAppStore = create<AppStore>((set, get) => ({
  // Auth state
  user: null,
  session: null,
  userRole: null,
  isLoading: true,

  setSession: (session: Session | null) => {
    set({ session, user: session?.user ?? null });
  },

  setUser: (user: User | null) => {
    set({ user });
  },

  setUserRole: (role: UserRole | null) => {
    set({ userRole: role });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, userRole: null, favorites: [] });
    router.replace('/(auth)/connexion');
  },

  // Favorites state (commerce IDs)
  favorites: [],

  addFavorite: (commerceId: string) => {
    const current = get().favorites;
    if (!current.includes(commerceId)) {
      set({ favorites: [...current, commerceId] });
    }
  },

  removeFavorite: (commerceId: string) => {
    set({ favorites: get().favorites.filter((id) => id !== commerceId) });
  },

  toggleFavorite: async (commerceId: string) => {
    const { user, favorites } = get();
    const isCurrentlyFav = favorites.includes(commerceId);

    // Optimistic update — instant UI feedback
    set({
      favorites: isCurrentlyFav
        ? favorites.filter((id) => id !== commerceId)
        : [...favorites, commerceId],
    });

    // Sync to Supabase — rollback on failure
    if (user) {
      try {
        if (isCurrentlyFav) {
          const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('client_id', user.id)
            .eq('commerce_id', commerceId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('favorites')
            .insert({ client_id: user.id, commerce_id: commerceId });
          if (error) throw error;
        }
      } catch {
        // Rollback optimistic update on failure
        set({
          favorites: isCurrentlyFav
            ? [...get().favorites, commerceId]
            : get().favorites.filter((id) => id !== commerceId),
        });
      }
    }
  },

  setFavorites: (commerceIds: string[]) => {
    set({ favorites: commerceIds });
  },

  isFavorite: (commerceId: string) => {
    return get().favorites.includes(commerceId);
  },
}));
