/**
 * Les commandes de démonstration ont des identifiants qui commencent par
 * « mock- » : on les reconnaît pour ne pas les traiter comme de vraies
 * commandes (pas de QR code valable, pas d'appel au serveur).
 */
export function isMockOrderId(id: string): boolean {
  return id.startsWith('mock-');
}
