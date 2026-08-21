/**
 * Créneau de retrait : à quel moment le QR code et la confirmation s'ouvrent.
 *
 * La confirmation de réception est notre preuve d'exécution face à une
 * contestation bancaire. Une confirmation donnée le matin pour un retrait du
 * soir ne prouve rien : elle doit être faite pendant le créneau, devant le
 * commerçant.
 */

/**
 * Tolérance de retard après la fermeture du créneau.
 *
 * Doit rester égale à `DELAI_RETARD_MS` dans `src/lib/stripe/capture.ts` côté
 * serveur. Sans elle, l'écran retirait le bouton de confirmation à la seconde
 * où le créneau se fermait, alors que le serveur acceptait encore le retrait
 * pendant une demi-heure : un client arrivé avec cinq minutes de retard
 * repartait avec son panier sans pouvoir le confirmer, et était compté absent.
 */
export const TOLERANCE_RETARD_MS = 30 * 60 * 1000;

export type EtatCreneau =
  | { phase: "avant"; debut: Date; fin: Date; msRestants: number }
  | { phase: "pendant"; debut: Date; fin: Date }
  // Créneau clos, mais la confirmation reste ouverte pendant la tolérance.
  | { phase: "tolerance"; debut: Date; fin: Date; msRestants: number }
  | { phase: "apres"; debut: Date; fin: Date }
  // Créneau incalculable (format hérité "today"/"tomorrow", données
  // incomplètes) : on n'enferme pas le client dehors, on ouvre.
  | { phase: "indetermine" };

/**
 * Convertit une date + heure murale « Europe/Paris » en instant UTC exact.
 * Gère l'heure d'été et d'hiver sans table de correspondance.
 *
 * Même logique que le cron `no-show` côté serveur : les deux doivent s'accorder
 * sur ce qu'est la fin d'un créneau, sinon un client verrait son bouton
 * disparaître une heure avant que le serveur ne le considère absent.
 */
export function parisVersUtc(dateStr: string, timeStr: string): Date | null {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  if (![y, m, d, hh, mm].every(Number.isFinite)) return null;

  const suppose = Date.UTC(y, m - 1, d, hh, mm, 0);
  const paris = new Date(
    new Date(suppose).toLocaleString("en-US", { timeZone: "Europe/Paris" }),
  ).getTime();
  const utc = new Date(
    new Date(suppose).toLocaleString("en-US", { timeZone: "UTC" }),
  ).getTime();
  return new Date(suppose - (paris - utc));
}

export function etatCreneau(
  pickupDate: string | null | undefined,
  pickupStart: string | null | undefined,
  pickupEnd: string | null | undefined,
  maintenant: Date = new Date(),
): EtatCreneau {
  if (!pickupDate || !pickupStart || !pickupEnd) return { phase: "indetermine" };
  // Format hérité jamais résolu en date réelle : rien à calculer.
  if (pickupDate === "today" || pickupDate === "tomorrow") return { phase: "indetermine" };

  const debut = parisVersUtc(pickupDate, pickupStart);
  const fin = parisVersUtc(pickupDate, pickupEnd);
  if (!debut || !fin) return { phase: "indetermine" };

  const t = maintenant.getTime();
  if (t < debut.getTime()) {
    return { phase: "avant", debut, fin, msRestants: debut.getTime() - t };
  }
  if (t <= fin.getTime()) return { phase: "pendant", debut, fin };
  if (t <= fin.getTime() + TOLERANCE_RETARD_MS) {
    return {
      phase: "tolerance",
      debut,
      fin,
      msRestants: fin.getTime() + TOLERANCE_RETARD_MS - t,
    };
  }
  return { phase: "apres", debut, fin };
}

/** « 3 h 12 min », « 12 min 40 s » — l'unité s'affine à mesure qu'on approche. */
export function formaterCompteARebours(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const min = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) return `${h} h ${String(min).padStart(2, "0")} min`;
  if (min > 0) return `${min} min ${String(s).padStart(2, "0")} s`;
  return `${s} s`;
}
