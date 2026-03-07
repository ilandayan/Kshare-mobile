import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';

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
    title: 'Carte',
    icon: 'map-outline',
    activeIcon: 'map',
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
        tabBarActiveTintColor: '#3744C8',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#F3F4F6',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <View>
                <Ionicons
                  name={focused ? tab.activeIcon : tab.icon}
                  size={size ?? 24}
                  color={color}
                />
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
