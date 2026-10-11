import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity, } from 'react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './src/screens/LoginScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import PropertiesScreen from './src/screens/PropertiesScreen';
import GuestsScreen from './src/screens/GuestsScreen';
import LockManagementScreen from './src/screens/LockManagementScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import NetworkStatus from './src/components/NetworkStatus';
import SignUpScreen from './src/screens/SignUpScreen';
import EntryLogsScreen from './src/screens/EntryLogsScreen';

import { ThemeProvider } from './src/context/ThemeContext';
import { supabase } from './src/lib/supabase';

const Tab = createBottomTabNavigator();


function MainAppTabs({ onLogout }) {
  const MoreStack = createNativeStackNavigator();

  function MoreMenuScreen({ navigation }) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F7FB', padding: 20 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#17263C' }}>
          More
        </Text>
        <Text style={{ color: '#788394', marginTop: 6, marginBottom: 22 }}>
          Security tools and app settings
        </Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('EntryLogs')}
          style={{
            backgroundColor: '#FFFFFF',
            padding: 18,
            borderRadius: 14,
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Ionicons name="document-text-outline" size={24} color="#245DB0" />
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#17263C' }}>
              Entry Logs
            </Text>
            <Text style={{ fontSize: 12, color: '#788394', marginTop: 4 }}>
              View establishment access records
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#788394" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={{
            backgroundColor: '#FFFFFF',
            padding: 18,
            borderRadius: 14,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Ionicons name="settings-outline" size={24} color="#245DB0" />
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#17263C' }}>
              Settings
            </Text>
            <Text style={{ fontSize: 12, color: '#788394', marginTop: 4 }}>
              Manage your app preferences
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#788394" />
        </TouchableOpacity>
      </View>
    );
  }

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

          if (route.name === 'Home') iconName = 'home-outline';
          else if (route.name === 'Properties') iconName = 'business-outline';
          else if (route.name === 'Guests') iconName = 'people-outline';
          else if (route.name === 'Lock') iconName = 'lock-closed-outline';
          else if (route.name === 'More') iconName = 'ellipsis-horizontal-circle-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Properties" component={PropertiesScreen} />
      <Tab.Screen name="Guests" component={GuestsScreen} />
      <Tab.Screen name="Lock" component={LockManagementScreen} />

      <Tab.Screen name="More">
        {() => (
          <MoreStack.Navigator screenOptions={{ headerShown: false }}>
            <MoreStack.Screen name="MoreMenu">
              {(props) => <MoreMenuScreen {...props} />}
            </MoreStack.Screen>

            <MoreStack.Screen name="EntryLogs" component={EntryLogsScreen} />

            <MoreStack.Screen name="Settings">
              {() => <SettingsScreen onLogout={onLogout} />}
            </MoreStack.Screen>
          </MoreStack.Navigator>
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

  /*
   * -----------------------------------------
   * SUPABASE AUTH INITIALIZATION
   * -----------------------------------------
   */
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('Supabase getSession error:', error);
        }

        if (mounted) {
          setSession(session);
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);

        if (mounted) {
          setSession(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('Supabase Auth Event:', event);

        if (!mounted) {
          return;
        }

        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
          setSession(newSession);
          return;
        }

        if (
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'INITIAL_SESSION'
        ) {
          setSession(newSession);
          return;
        }

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setIsPasswordRecovery(false);
          setShowSignUp(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /*
   * -----------------------------------------
   * PASSWORD RESET DEEP LINK
   * -----------------------------------------
   */
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
      try {
        const initialUrl = await Linking.getInitialURL();

        if (initialUrl) {
          await handleDeepLink(initialUrl);
        }
      } catch (error) {
        console.error('Initial deep link error:', error);
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

  /*
   * -----------------------------------------
   * AFTER PASSWORD RESET
   * -----------------------------------------
   */
  const handlePasswordUpdated = async () => {
    setIsPasswordRecovery(false);

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out after password reset failed:', error);
    }

    setSession(null);
  };

  /*
   * -----------------------------------------
   * LOGOUT
   * -----------------------------------------
   */
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Logout error:', error);
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  /*
   * -----------------------------------------
   * LOADING
   * -----------------------------------------
   */
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="#111111"
        />
      </View>
    );
  }

  /*
   * -----------------------------------------
   * APP
   * -----------------------------------------
   */
  return (
    <ThemeProvider>
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
            onSignUp={() => {
              setShowSignUp(true);
            }}
          />
        )}
      </NavigationContainer>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});