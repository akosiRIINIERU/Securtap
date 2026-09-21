import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen({ onLogout }) {
  const [notifications, setNotifications] = useState(true);
  const [activityAlerts, setActivityAlerts] = useState(true);
  const [guestAlerts, setGuestAlerts] = useState(true);
  const [lockAlerts, setLockAlerts] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [biometricLogin, setBiometricLogin] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: onLogout,
        },
      ]
    );
  };

  const SettingRow = ({
    icon,
    title,
    subtitle,
    right,
    onPress,
  }) => {
    return (
      <TouchableOpacity
        style={styles.settingRow}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={21} color="#222" />
        </View>

        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>{title}</Text>

          {subtitle && (
            <Text style={styles.settingSubtitle}>{subtitle}</Text>
          )}
        </View>

        {right}
      </TouchableOpacity>
    );
  };

  const SwitchControl = ({ value, onValueChange }) => (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{
        false: '#cfcfcf',
        true: '#222',
      }}
      thumbColor="#fff"
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandTitle}>SECURTAP</Text>
            <Text style={styles.headerTitle}>Settings</Text>
          </View>
        </View>

        {/* Account */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>

        <View style={styles.sectionCard}>
          <SettingRow
            icon="person-outline"
            title="Admin Profile"
            subtitle="Manage your administrator information"
            right={<Ionicons name="chevron-forward" size={20} color="#888" />}
          />

          <SettingRow
            icon="key-outline"
            title="Change Password"
            subtitle="Update your account password"
            right={<Ionicons name="chevron-forward" size={20} color="#888" />}
          />

          <SettingRow
            icon="shield-checkmark-outline"
            title="Security"
            subtitle="Manage account security"
            right={<Ionicons name="chevron-forward" size={20} color="#888" />}
          />

          <SettingRow
            icon="finger-print-outline"
            title="Biometric Login"
            subtitle="Use fingerprint or device biometrics"
            right={
              <SwitchControl
                value={biometricLogin}
                onValueChange={setBiometricLogin}
              />
            }
          />
        </View>

        {/* Notifications */}
        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>

        <View style={styles.sectionCard}>
          <SettingRow
            icon="notifications-outline"
            title="Notifications"
            subtitle="Enable SECURTAP notifications"
            right={
              <SwitchControl
                value={notifications}
                onValueChange={setNotifications}
              />
            }
          />

          <SettingRow
            icon="pulse-outline"
            title="Activity Alerts"
            subtitle="Get notified about lock activity"
            right={
              <SwitchControl
                value={activityAlerts}
                onValueChange={setActivityAlerts}
              />
            }
          />

          <SettingRow
            icon="people-outline"
            title="Guest Alerts"
            subtitle="Get notified about guest activity"
            right={
              <SwitchControl
                value={guestAlerts}
                onValueChange={setGuestAlerts}
              />
            }
          />

          <SettingRow
            icon="lock-closed-outline"
            title="Lock Alerts"
            subtitle="Get notified about lock status"
            right={
              <SwitchControl
                value={lockAlerts}
                onValueChange={setLockAlerts}
              />
            }
          />
        </View>

        {/* Appearance */}
        <Text style={styles.sectionLabel}>APPEARANCE</Text>

        <View style={styles.sectionCard}>
          <SettingRow
            icon="moon-outline"
            title="Dark Mode"
            subtitle="Change the appearance of SECURTAP"
            right={
              <SwitchControl
                value={darkMode}
                onValueChange={setDarkMode}
              />
            }
          />

          <SettingRow
            icon="phone-portrait-outline"
            title="Display"
            subtitle="Mobile display preferences"
            right={
              <Ionicons name="chevron-forward" size={20} color="#888" />
            }
          />
        </View>

        {/* Lock & Property */}
        <Text style={styles.sectionLabel}>LOCK & PROPERTY</Text>

        <View style={styles.sectionCard}>
          <SettingRow
            icon="key-outline"
            title="Lock Settings"
            subtitle="Manage smart lock preferences"
            right={
              <Ionicons name="chevron-forward" size={20} color="#888" />
            }
          />

          <SettingRow
            icon="card-outline"
            title="NFC Cards"
            subtitle="Manage registered NFC cards"
            right={
              <Ionicons name="chevron-forward" size={20} color="#888" />
            }
          />

          <SettingRow
            icon="finger-print-outline"
            title="Fingerprints"
            subtitle="Manage registered fingerprints"
            right={
              <Ionicons name="chevron-forward" size={20} color="#888" />
            }
          />

          <SettingRow
            icon="business-outline"
            title="Property Settings"
            subtitle="Manage your properties and units"
            right={
              <Ionicons name="chevron-forward" size={20} color="#888" />
            }
          />
        </View>

        {/* Data & Privacy */}
        <Text style={styles.sectionLabel}>DATA & PRIVACY</Text>

        <View style={styles.sectionCard}>
          <SettingRow
            icon="cloud-outline"
            title="Data & Storage"
            subtitle="Manage application data"
            right={
              <Ionicons name="chevron-forward" size={20} color="#888" />
            }
          />

          <SettingRow
            icon="document-text-outline"
            title="Activity Logs"
            subtitle="View system and security logs"
            right={
              <Ionicons name="chevron-forward" size={20} color="#888" />
            }
          />

          <SettingRow
            icon="shield-outline"
            title="Privacy"
            subtitle="Review privacy settings"
            right={
              <Ionicons name="chevron-forward" size={20} color="#888" />
            }
          />
        </View>

        {/* Support */}
        <Text style={styles.sectionLabel}>SUPPORT</Text>

        <View style={styles.sectionCard}>
          <SettingRow
            icon="help-circle-outline"
            title="Help & Support"
            subtitle="Get help with SECURTAP"
            right={
              <Ionicons name="chevron-forward" size={20} color="#888" />
            }
          />

          <SettingRow
            icon="bug-outline"
            title="Report a Problem"
            subtitle="Report an issue with the application"
            right={
              <Ionicons name="chevron-forward" size={20} color="#888" />
            }
          />

          <SettingRow
            icon="information-circle-outline"
            title="About SECURTAP"
            subtitle="Version 1.0.0"
            right={
              <Ionicons name="chevron-forward" size={20} color="#888" />
            }
          />
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={21} color="#d11" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>
          SECURTAP • Version 1.0.0
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

  scrollContent: {
    padding: 20,
    paddingBottom: 110,
  },

  header: {
    marginBottom: 25,
  },

  brandTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },

  headerTitle: {
    fontSize: 25,
    fontWeight: '700',
    marginTop: 5,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#777',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 10,
    marginLeft: 4,
  },

  sectionCard: {
    backgroundColor: '#eeeeee',
    borderRadius: 18,
    paddingVertical: 4,
    marginBottom: 18,
  },

  settingRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  settingInfo: {
    flex: 1,
    paddingRight: 8,
  },

  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },

  settingSubtitle: {
    fontSize: 11,
    color: '#777',
    marginTop: 3,
    lineHeight: 15,
  },

  logoutButton: {
    height: 52,
    borderRadius: 18,
    backgroundColor: '#eeeeee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },

  logoutText: {
    color: '#d11',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },

  versionText: {
    textAlign: 'center',
    fontSize: 10,
    color: '#999',
    marginTop: 15,
  },
});