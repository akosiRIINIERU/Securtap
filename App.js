import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from './src/lib/supabase';

import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import PropertiesScreen from './src/screens/PropertiesScreen';
import GuestsScreen from './src/screens/GuestsScreen';
import LockManagementScreen from './src/screens/LockManagementScreen';
import SettingsScreen from './src/screens/SettingsScreen';

import NetworkStatus from './src/components/NetworkStatus';

const Tab = createBottomTabNavigator();

function MainAppTabs({ onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,

        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = 'home-outline';
          } else if (route.name === 'Properties') {
            iconName = 'business-outline';
          } else if (route.name === 'Guests') {
            iconName = 'people-outline';
          } else if (route.name === 'Lock') {
            iconName = 'key-outline';
          } else {
            iconName = 'ellipsis-horizontal-outline';
          }

          return (
            <Ionicons
              name={iconName}
              size={size}
              color={color}
            />
          );
        },

        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#888',
      })}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
      />

      <Tab.Screen
        name="Properties"
        component={PropertiesScreen}
      />

      <Tab.Screen
        name="Guests"
        component={GuestsScreen}
      />

      <Tab.Screen
        name="Lock"
        component={LockManagementScreen}
      />

      <Tab.Screen name="More">
        {() => (
          <SettingsScreen
            onLogout={onLogout}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const getSession = async () => {
      try {
        const {
          data,
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.log('Session error:', error);

          if (mounted) {
            setSession(null);
          }

          return;
        }

        if (mounted) {
          setSession(data.session);
        }
      } catch (error) {
        console.log('Session check failed:', error);

        if (mounted) {
          setSession(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setSession(session);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.log('Logout error:', error);
        return;
      }

      setSession(null);
    } catch (error) {
      console.log('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color="#000"
        />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer>
        {session ? (
          <MainAppTabs
            onLogout={handleLogout}
          />
        ) : (
          <LoginScreen
            onLoginSuccess={setSession}
          />
        )}
      </NavigationContainer>

      <NetworkStatus />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  tabBar: {
    backgroundColor: '#eeeeee',
    borderRadius: 30,
    marginHorizontal: 12,
    marginBottom: 12,
    height: 60,
    position: 'absolute',
    borderTopWidth: 0,
    elevation: 3,
    paddingTop: 5,
    paddingBottom: 5,
  },
});