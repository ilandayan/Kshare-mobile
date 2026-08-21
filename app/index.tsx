import { Redirect } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function IndexPage() {
  const { session, isLoading, userRole } = useAppStore();

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#3744C8" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/connexion" />;
  }

  // L'espace association vit sur le site, pas dans l'application : on renvoie
  // vers le bon endroit plutôt que d'entretenir ici une seconde interface que
  // personne n'ouvre et qui finit par diverger de celle du web.
  if (userRole === 'association') {
    return <Redirect href="/espace-association" />;
  }

  // Default: client tabs
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
});
