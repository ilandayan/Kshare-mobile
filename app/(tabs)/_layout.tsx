import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  title: string;
  icon: IoniconName;
  activeIcon: IoniconName;
}

const tabs: TabConfig[] = [
  {
    name: 'index',
    title: 'Accueil',
    icon: 'home-outline',
    activeIcon: 'home',
  },
  {
    name: 'carte',
    title: 'Rechercher',
    icon: 'search-outline',
    activeIcon: 'search',
  },
  {
    name: 'favoris',
    title: 'Favoris',
    icon: 'heart-outline',
    activeIcon: 'heart',
  },
  {
    name: 'paniers',
    title: 'Paniers',
    icon: 'bag-outline',
    activeIcon: 'bag',
  },
  {
    name: 'profil',
    title: 'Profil',
    icon: 'person-outline',
    activeIcon: 'person',
  },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.55)',
        tabBarBackground: () => (
          <LinearGradient
            colors={['#1e2a78', '#2d4de0', '#4f6df5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
          />
        ),
        tabBarStyle: {
          borderTopWidth: 0,
          height: Platform.OS === 'android' ? 68 : 88,
          paddingBottom: Platform.OS === 'android' ? 10 : 26,
          paddingTop: 8,
          elevation: 0,
          borderRadius: 20,
          overflow: 'hidden',
          position: 'absolute',
          bottom: 0,
          left: Platform.OS === 'web' ? 10 : 0,
          right: Platform.OS === 'web' ? 10 : 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarAccessibilityLabel: `Onglet ${tab.title}`,
            tabBarIcon: ({ focused, color }) => (
              <View style={styles.iconWrapper} accessible={false}>
                {/* Active pill highlight behind icon */}
                {focused && <View style={styles.activePill} />}
                <View style={styles.iconInner}>
                  <Ionicons
                    name={focused ? tab.activeIcon : tab.icon}
                    size={22}
                    color={color}
                  />
                </View>
              </View>
            ),
          }}
        />
      ))}
      {/* Hide rechercher from tab bar */}
      <Tabs.Screen name="rechercher" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 32,
    position: 'relative',
  },
  activePill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
  },
  iconInner: {
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
