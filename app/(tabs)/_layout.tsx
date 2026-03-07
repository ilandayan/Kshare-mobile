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
    name: 'rechercher',
    title: 'Rechercher',
    icon: 'search-outline',
    activeIcon: 'search',
  },
  {
    name: 'paniers',
    title: 'Mes paniers',
    icon: 'bag-outline',
    activeIcon: 'bag',
  },
  {
    name: 'favoris',
    title: 'Favoris',
    icon: 'heart-outline',
    activeIcon: 'heart',
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
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f3f4f6',
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
    </Tabs>
  );
}
