import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface PlatformLaunch {
  launched: boolean;
  /** Date d'ouverture fixée dans l'espace admin, au format AAAA-MM-JJ. */
  launchDate: string | null;
}

export const PLATFORM_LAUNCH_KEY = ['platform-launch'] as const;

/**
 * État de lancement de la plateforme, piloté depuis l'espace admin
 * (page Lancement) : une date d'ouverture, ou un lancement immédiat. Le jour
 * venu, une tâche planifiée passe `launched` à vrai côté serveur.
 *
 * En cas d'échec de lecture, `data` reste indéfini : l'appelant n'affiche
 * rien plutôt qu'une bannière de pré-lancement après l'ouverture.
 */
export function usePlatformLaunch() {
  return useQuery({
    queryKey: PLATFORM_LAUNCH_KEY,
    queryFn: async (): Promise<PlatformLaunch> => {
      const { data, error } = await supabase
        .from('platform_config')
        .select('launched, launch_date')
        .eq('id', true)
        .maybeSingle();
      if (error) throw error;
      return { launched: data?.launched === true, launchDate: data?.launch_date ?? null };
    },
    staleTime: 5 * 60 * 1000,
  });
}
