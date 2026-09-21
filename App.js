import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import all your individual screen components from the src/screens folder
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import PropertiesScreen from './src/screens/PropertiesScreen';
import GuestsScreen from './src/screens/GuestsScreen';
import LockManagementScreen from './src/screens/LockManagementScreen';

const Tab = createBottomTabNavigator();

// Placeholder for the "More" option tab
function PlaceholderMore() {
  return <View style={{ flex: 1, backgroundColor: '#fff' }} />;
}

// Bottom Tab Navigator mapping your wireframe screens
function MainAppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = 'home-outline';
          else if (route.name === 'Properties') iconName = 'business-outline';
          else if (route.name === 'Guests') iconName = 'people-outline';
          else if (route.name === 'Lock') iconName = 'key-outline';
          else if (route.name === 'More') iconName = 'ellipsis-horizontal-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#888',
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Properties" component={PropertiesScreen} />
      <Tab.Screen name="Guests" component={GuestsScreen} />
      <Tab.Screen name="Lock" component={LockManagementScreen} />
      <Tab.Screen name="More" component={PlaceholderMore} />
    </Tab.Navigator>
  );
}

// Main Application Entry Point
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <NavigationContainer>
      {isLoggedIn ? (
        <MainAppTabs />
      ) : (
        <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
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