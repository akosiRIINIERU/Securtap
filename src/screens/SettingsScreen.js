import React, { useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  supabase,
  getSupabaseErrorMessage,
} from '../lib/supabase';

export default function SettingsScreen({
  onLogout,
}) {
  const [
    notificationsEnabled,
    setNotificationsEnabled,
  ] = useState(true);

  const [
    activityAlerts,
    setActivityAlerts,
  ] = useState(true);

  const [
    guestAlerts,
    setGuestAlerts,
  ] = useState(true);

  const [
    lockAlerts,
    setLockAlerts,
  ] = useState(true);

  const [
    darkMode,
    setDarkMode,
  ] = useState(false);

  const [
    biometricLogin,
    setBiometricLogin,
  ] = useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: performLogout,
        },
      ]
    );
  };

  const performLogout = async () => {
    setLoggingOut(true);

    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error(
          'Logout error:',
          error
        );

        throw error;
      }

      onLogout();

    } catch (error) {
      console.error(
        'Logout error:',
        error
      );

      Alert.alert(
        'Logout Failed',
        getSupabaseErrorMessage(error)
      );
    } finally {
      setLoggingOut(false);
    }
  };

  const SettingRow = ({
    icon,
    title,
    subtitle,
    onPress,
    rightComponent,
  }) => {
    return (
      <TouchableOpacity
        style={styles.settingRow}
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={styles.settingIcon}>
          <Ionicons
            name={icon}
            size={21}
            color="#111"
          />
        </View>

        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>
            {title}
          </Text>

          {subtitle && (
            <Text style={styles.settingSubtitle}>
              {subtitle}
            </Text>
          )}
        </View>

        {rightComponent || (
          <Ionicons
            name="chevron-forward"
            size={20}
            color="#888"
          />
        )}
      </TouchableOpacity>
    );
  };

  const SwitchControl = ({
    value,
    onValueChange,
  }) => (
    <Switch
      value={value}
      onValueChange={onValueChange}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >

        <Text style={styles.title}>
          Settings
        </Text>

        <Text style={styles.subtitle}>
          Manage your SECURTAP admin account
        </Text>

        {/* ACCOUNT */}

        <Text style={styles.sectionTitle}>
          ACCOUNT
        </Text>

        <View style={styles.sectionCard}>

          <SettingRow
            icon="person-outline"
            title="Admin Profile"
            subtitle="Manage your account information"
            onPress={() =>
              Alert.alert(
                'Admin Profile',
                'Profile management will be connected to Supabase.'
              )
            }
          />

          <SettingRow
            icon="key-outline"
            title="Change Password"
            subtitle="Update your account password"
            onPress={() =>
              Alert.alert(
                'Change Password',
                'Password management will be connected to Supabase Auth.'
              )
            }
          />

          <SettingRow
            icon="shield-checkmark-outline"
            title="Security"
            subtitle="Manage account security"
            onPress={() =>
              Alert.alert(
                'Security',
                'Security settings will be available here.'
              )
            }
          />

          <SettingRow
            icon="finger-print-outline"
            title="Biometric Login"
            subtitle="Use device biometrics to sign in"
            rightComponent={
              <SwitchControl
                value={biometricLogin}
                onValueChange={
                  setBiometricLogin
                }
              />
            }
          />

        </View>

        {/* NOTIFICATIONS */}

        <Text style={styles.sectionTitle}>
          NOTIFICATIONS
        </Text>

        <View style={styles.sectionCard}>

          <SettingRow
            icon="notifications-outline"
            title="Notifications"
            subtitle="Enable SECURTAP notifications"
            rightComponent={
              <SwitchControl
                value={
                  notificationsEnabled
                }
                onValueChange={
                  setNotificationsEnabled
                }
              />
            }
          />

          <SettingRow
            icon="pulse-outline"
            title="Activity Alerts"
            subtitle="Receive system activity alerts"
            rightComponent={
              <SwitchControl
                value={activityAlerts}
                onValueChange={
                  setActivityAlerts
                }
              />
            }
          />

          <SettingRow
            icon="people-outline"
            title="Guest Alerts"
            subtitle="Receive guest activity alerts"
            rightComponent={
              <SwitchControl
                value={guestAlerts}
                onValueChange={
                  setGuestAlerts
                }
              />
            }
          />

          <SettingRow
            icon="lock-closed-outline"
            title="Lock Alerts"
            subtitle="Receive smart lock alerts"
            rightComponent={
              <SwitchControl
                value={lockAlerts}
                onValueChange={
                  setLockAlerts
                }
              />
            }
          />

        </View>

        {/* APPEARANCE */}

        <Text style={styles.sectionTitle}>
          APPEARANCE
        </Text>

        <View style={styles.sectionCard}>

          <SettingRow
            icon="moon-outline"
            title="Dark Mode"
            subtitle="Use dark appearance"
            rightComponent={
              <SwitchControl
                value={darkMode}
                onValueChange={setDarkMode}
              />
            }
          />

          <SettingRow
            icon="phone-portrait-outline"
            title="Display"
            subtitle="Manage display preferences"
            onPress={() =>
              Alert.alert(
                'Display',
                'Display settings will be available here.'
              )
            }
          />

        </View>

        {/* LOCK & PROPERTY */}

        <Text style={styles.sectionTitle}>
          LOCK & PROPERTY
        </Text>

        <View style={styles.sectionCard}>

          <SettingRow
            icon="settings-outline"
            title="Lock Settings"
            subtitle="Manage smart lock configuration"
            onPress={() =>
              Alert.alert(
                'Lock Settings',
                'Lock settings are available from Lock Management.'
              )
            }
          />

          <SettingRow
            icon="card-outline"
            title="NFC Cards"
            subtitle="Manage registered NFC cards"
            onPress={() =>
              Alert.alert(
                'NFC Cards',
                'NFC card management will be connected to Supabase.'
              )
            }
          />

          <SettingRow
            icon="finger-print-outline"
            title="Fingerprints"
            subtitle="Manage registered fingerprints"
            onPress={() =>
              Alert.alert(
                'Fingerprints',
                'Fingerprint management will be connected to the smart-lock system.'
              )
            }
          />

          <SettingRow
            icon="business-outline"
            title="Property Settings"
            subtitle="Manage your properties"
            onPress={() =>
              Alert.alert(
                'Property Settings',
                'Property management is available from the Properties tab.'
              )
            }
          />

        </View>

        {/* DATA & PRIVACY */}

        <Text style={styles.sectionTitle}>
          DATA & PRIVACY
        </Text>

        <View style={styles.sectionCard}>

          <SettingRow
            icon="server-outline"
            title="Data & Storage"
            subtitle="Manage SECURTAP data"
            onPress={() =>
              Alert.alert(
                'Data & Storage',
                'Data management options will be available here.'
              )
            }
          />

          <SettingRow
            icon="list-outline"
            title="Activity Logs"
            subtitle="View system activity"
            onPress={() =>
              Alert.alert(
                'Activity Logs',
                'Activity logs are stored in Supabase.'
              )
            }
          />

          <SettingRow
            icon="shield-outline"
            title="Privacy"
            subtitle="Review privacy settings"
            onPress={() =>
              Alert.alert(
                'Privacy',
                'Privacy settings will be available here.'
              )
            }
          />

        </View>

        {/* SUPPORT */}

        <Text style={styles.sectionTitle}>
          SUPPORT
        </Text>

        <View style={styles.sectionCard}>

          <SettingRow
            icon="help-circle-outline"
            title="Help & Support"
            subtitle="Get help with SECURTAP"
            onPress={() =>
              Alert.alert(
                'Help & Support',
                'Support options will be available here.'
              )
            }
          />

          <SettingRow
            icon="bug-outline"
            title="Report a Problem"
            subtitle="Report an issue with SECURTAP"
            onPress={() =>
              Alert.alert(
                'Report a Problem',
                'Problem reporting will be connected to Supabase.'
              )
            }
          />

          <SettingRow
            icon="information-circle-outline"
            title="About SECURTAP"
            subtitle="Version 1.0.0"
            onPress={() =>
              Alert.alert(
                'SECURTAP',
                'Smart access and property management system.\n\nVersion 1.0.0'
              )
            }
          />

        </View>

        {/* LOGOUT */}

        <TouchableOpacity
          style={[
            styles.logoutButton,
            loggingOut &&
              styles.logoutDisabled,
          ]}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator color="#b00020" />
          ) : (
            <>
              <Ionicons
                name="log-out-outline"
                size={21}
                color="#b00020"
              />

              <Text style={styles.logoutText}>
                Log Out
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.versionText}>
          SECURTAP v1.0.0
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  content: {
    padding: 20,
    paddingBottom: 100,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111',
  },

  subtitle: {
    fontSize: 14,
    color: '#777',
    marginTop: 5,
    marginBottom: 25,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#777',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 15,
  },

  sectionCard: {
    backgroundColor: '#f4f4f4',
    borderRadius: 18,
    overflow: 'hidden',
  },

  settingRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },

  settingIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  settingInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },

  settingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },

  settingSubtitle: {
    fontSize: 12,
    color: '#777',
    marginTop: 3,
  },

  logoutButton: {
    height: 55,
    borderWidth: 1,
    borderColor: '#e0b7b7',
    borderRadius: 15,
    marginTop: 30,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },

  logoutDisabled: {
    opacity: 0.6,
  },

  logoutText: {
    color: '#b00020',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },

  versionText: {
    textAlign: 'center',
    color: '#aaa',
    fontSize: 12,
    marginTop: 18,
  },
});