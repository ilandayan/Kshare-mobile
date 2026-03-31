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
    name: 'dons',
    title: 'Dons',
    icon: 'gift-outline',
    activeIcon: 'gift',
  },
  {
    name: 'reservations',
    title: 'Réservations',
    icon: 'clipboard-outline',
    activeIcon: 'clipboard',
  },
  {
    name: 'asso-profil',
    title: 'Profil',
    icon: 'person-outline',
    activeIcon: 'person',
  },
];

export default function AssoTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.55)',
        tabBarBackground: () => (
          <LinearGradient
            colors={['#1e6b4f', '#2a9d6e', '#3cc88a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarStyle: {
          borderTopWidth: 0,
          height: Platform.OS === 'android' ? 68 : 88,
          paddingBottom: Platform.OS === 'android' ? 10 : 26,
          paddingTop: 8,
          elevation: 0,
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
