import { Redirect } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function IndexPage() {
  const { session, isLoading } = useAppStore();

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/connexion" />;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
});
