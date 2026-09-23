import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

import LoginScreen from './src/screens/LoginScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import PropertiesScreen from './src/screens/PropertiesScreen';
import GuestsScreen from './src/screens/GuestsScreen';
import LockManagementScreen from './src/screens/LockManagementScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import NetworkStatus from './src/components/NetworkStatus';
import SignUpScreen from './src/screens/SignUpScreen';

import { supabase } from './src/lib/supabase';

const Tab = createBottomTabNavigator();

function MainAppTabs({ onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarActiveTintColor: '#111111',
        tabBarInactiveTintColor: '#999999',

        tabBarStyle: {
          height: 65,
          paddingBottom: 8,
          paddingTop: 6,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#eeeeee',
        },

        tabBarIcon: ({ color, size }) => {
          let iconName = 'ellipse-outline';

          if (route.name === 'Home') {
            iconName = 'home-outline';
          } else if (route.name === 'Properties') {
            iconName = 'business-outline';
          } else if (route.name === 'Guests') {
            iconName = 'people-outline';
          } else if (route.name === 'Lock') {
            iconName = 'lock-closed-outline';
          } else if (route.name === 'More') {
            iconName = 'ellipsis-horizontal-circle-outline';
          }

          return (
            <Ionicons
              name={iconName}
              size={size}
              color={color}
            />
          );
        },
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
          <SettingsScreen onLogout={onLogout} />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setSession(session);
        setLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Supabase Auth Event:', event);

        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
        }

        if (event === 'SIGNED_IN') {
          setSession(session);
        }

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setIsPasswordRecovery(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleDeepLink = async (url) => {
      if (!url) {
        return;
      }

      console.log('SECURTAP Deep Link:', url);

      if (url.startsWith('securtap://reset-password')) {
        setIsPasswordRecovery(true);
      }
    };

    const checkInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();

      if (initialUrl) {
        await handleDeepLink(initialUrl);
      }
    };

    checkInitialUrl();

    const subscription = Linking.addEventListener(
      'url',
      ({ url }) => {
        handleDeepLink(url);
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const handlePasswordUpdated = async () => {
    setIsPasswordRecovery(false);

    await supabase.auth.signOut();

    setSession(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return null;
  }

  return (
    <>
      <NetworkStatus />

      <NavigationContainer>
        {isPasswordRecovery ? (
  <ResetPasswordScreen
    onPasswordUpdated={handlePasswordUpdated}
  />
) : session ? (
  <MainAppTabs
    onLogout={handleLogout}
  />
) : showSignUp ? (
  <SignUpScreen
    onBackToLogin={() => setShowSignUp(false)}
  />
) : (
  <LoginScreen
    onLoginSuccess={(newSession) => {
      setSession(newSession);
    }}
    onSignUp={() => setShowSignUp(true)}
  />
)}
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({});
