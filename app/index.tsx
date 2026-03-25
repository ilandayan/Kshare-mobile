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

  // Route based on user role
  if (userRole === 'association') {
    return <Redirect href="/(asso-tabs)" />;
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
