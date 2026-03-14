import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// Mock saved cards — replace with real Stripe data later
interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

const MOCK_CARDS: SavedCard[] = [
  {
    id: 'pm_1',
    brand: 'visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2027,
    isDefault: true,
  },
];

function getCardIcon(brand: string): IoniconName {
  switch (brand.toLowerCase()) {
    case 'visa':
      return 'card-outline';
    case 'mastercard':
      return 'card-outline';
    default:
      return 'card-outline';
  }
}

function getCardColor(brand: string): string {
  switch (brand.toLowerCase()) {
    case 'visa':
      return '#1A1F71';
    case 'mastercard':
      return '#EB001B';
    default:
      return '#6B7280';
  }
}

// Generate random last4 for new mock cards
const BRANDS = ['visa', 'mastercard'] as const;
let nextCardId = 2;

export default function PaiementPage() {
  const [cards, setCards] = useState<SavedCard[]>(MOCK_CARDS);
  const [applePayEnabled, setApplePayEnabled] = useState(false);
  const [googlePayEnabled, setGooglePayEnabled] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const isIOS = Platform.OS === 'ios';

  const handleAddCard = () => {
    router.push('/profil/ajouter-carte');
  };

  const handleRemoveCard = (cardId: string) => {
    if (confirmDelete === cardId) {
      // Second tap → actually delete
      setCards((prev) => {
        const remaining = prev.filter((c) => c.id !== cardId);
        // If we removed the default, make the first remaining card default
        if (remaining.length > 0 && !remaining.some((c) => c.isDefault)) {
          remaining[0].isDefault = true;
        }
        return remaining;
      });
      setConfirmDelete(null);
    } else {
      // First tap → ask confirmation
      setConfirmDelete(cardId);
    }
  };

  const handleSetDefault = (card: SavedCard) => {
    if (card.isDefault) return;
    setCards((prev) =>
      prev.map((c) => ({ ...c, isDefault: c.id === card.id })),
    );
  };

  const handleToggleApplePay = (value: boolean) => {
    setApplePayEnabled(value);
  };

  const handleToggleGooglePay = (value: boolean) => {
    setGooglePayEnabled(value);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#3744C8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paiement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: '#F4F5F9' }}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Section: Cartes enregistrées */}
        <Text style={styles.sectionLabel}>CARTES ENREGISTRÉES</Text>

        {cards.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="card-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Aucune carte enregistrée</Text>
            <Text style={styles.emptySubtitle}>
              Ajoutez une carte pour faciliter vos achats
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            {cards.map((item, i) => (
              <React.Fragment key={item.id}>
                <TouchableOpacity
                  style={styles.cardRow}
                  onPress={() => handleSetDefault(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.cardIconWrap, { backgroundColor: `${getCardColor(item.brand)}10` }]}>
                    <Ionicons
                      name={getCardIcon(item.brand)}
                      size={20}
                      color={getCardColor(item.brand)}
                    />
                  </View>
                  <View style={styles.cardContent}>
                    <View style={styles.cardTop}>
                      <Text style={styles.cardBrand}>
                        {item.brand.charAt(0).toUpperCase() + item.brand.slice(1)}
                      </Text>
                      {item.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>Par défaut</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.cardNumber}>•••• •••• •••• {item.last4}</Text>
                    <Text style={styles.cardExpiry}>
                      Expire {String(item.expMonth).padStart(2, '0')}/{item.expYear}
                    </Text>
                  </View>
                  {confirmDelete === item.id ? (
                    <TouchableOpacity
                      style={styles.confirmDeleteBtn}
                      onPress={() => handleRemoveCard(item.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.confirmDeleteText}>Confirmer</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleRemoveCard(item.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
                {i < cards.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
        )}

        {/* Ajouter une carte */}
        <TouchableOpacity
          style={styles.addCardBtn}
          onPress={handleAddCard}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={20} color="#3744C8" />
          <Text style={styles.addCardText}>Ajouter une carte</Text>
        </TouchableOpacity>

        {/* Section: Paiement mobile */}
        <Text style={styles.sectionLabel}>PAIEMENT MOBILE</Text>
        <View style={styles.card}>
          {isIOS && (
            <View style={styles.walletRow}>
              <View style={[styles.walletIconWrap, { backgroundColor: '#000' }]}>
                <Ionicons name="logo-apple" size={20} color="#fff" />
              </View>
              <View style={styles.walletContent}>
                <Text style={styles.walletTitle}>Apple Pay</Text>
                <Text style={styles.walletSubtitle}>
                  {applePayEnabled ? 'Activé — paiement en un tap' : 'Payez rapidement avec Face ID'}
                </Text>
              </View>
              <Switch
                value={applePayEnabled}
                onValueChange={handleToggleApplePay}
                trackColor={{ false: '#D1D5DB', true: '#111827' }}
                thumbColor={undefined}
                ios_backgroundColor="#D1D5DB"
              />
            </View>
          )}

          {!isIOS && (
            <View style={styles.walletRow}>
              <View style={[styles.walletIconWrap, { backgroundColor: '#4285F4' }]}>
                <Ionicons name="logo-google" size={18} color="#fff" />
              </View>
              <View style={styles.walletContent}>
                <Text style={styles.walletTitle}>Google Pay</Text>
                <Text style={styles.walletSubtitle}>
                  {googlePayEnabled ? 'Activé — paiement en un tap' : 'Payez rapidement et en toute sécurité'}
                </Text>
              </View>
              <Switch
                value={googlePayEnabled}
                onValueChange={handleToggleGooglePay}
                trackColor={{ false: '#D1D5DB', true: '#4285F4' }}
                thumbColor="#fff"
                ios_backgroundColor="#D1D5DB"
              />
            </View>
          )}
        </View>

        {/* Section: Sécurité */}
        <Text style={styles.sectionLabel}>SÉCURITÉ</Text>
        <View style={styles.card}>
          <View style={styles.securityRow}>
            <View style={styles.securityIconWrap}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />
            </View>
            <View style={styles.securityContent}>
              <Text style={styles.securityTitle}>Paiements sécurisés</Text>
              <Text style={styles.securityText}>
                Vos informations bancaires sont protégées par Stripe. Kshare ne stocke jamais vos données de carte.
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.securityRow}>
            <View style={styles.securityIconWrap}>
              <Ionicons name="lock-closed-outline" size={18} color="#3744C8" />
            </View>
            <View style={styles.securityContent}>
              <Text style={styles.securityTitle}>Chiffrement SSL</Text>
              <Text style={styles.securityText}>
                Toutes les transactions sont chiffrées de bout en bout.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },

  // Card row
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardBrand: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  defaultBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3744C8',
  },
  cardNumber: {
    fontSize: 14,
    color: '#374151',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  cardExpiry: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  confirmDeleteBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  confirmDeleteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 16,
  },

  // Empty state
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
  },

  // Add card button
  addCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#3744C8',
    borderStyle: 'dashed',
    paddingVertical: 14,
  },
  addCardText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3744C8',
  },

  // Wallet row (Apple Pay / Google Pay)
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  walletIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  walletContent: {
    flex: 1,
    gap: 2,
  },
  walletTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  walletSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },

  // Security section
  securityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  securityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  securityContent: {
    flex: 1,
    gap: 2,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  securityText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
});
