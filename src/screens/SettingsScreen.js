import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

import {
  supabase,
  getSupabaseErrorMessage,
} from '../lib/supabase';

import { useTheme } from '../context/ThemeContext';

export default function SettingsScreen({ onLogout, navigation }) {
  const { colors, darkMode, setDarkMode } = useTheme();

  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState('');

  const [notifications, setNotifications] = useState(true);
  const [activityAlerts, setActivityAlerts] = useState(true);
  const [guestAlerts, setGuestAlerts] = useState(true);
  const [lockAlerts, setLockAlerts] = useState(true);

  const [biometricLogin, setBiometricLogin] = useState(false);

  const [autoLock, setAutoLock] = useState(true);
  const [unlockConfirmation, setUnlockConfirmation] =
    useState(true);

  const [reduceMotion, setReduceMotion] = useState(false);

  const [profileModal, setProfileModal] =
    useState(false);

  const [passwordModal, setPasswordModal] =
    useState(false);

  const [profileName, setProfileName] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [savingProfile, setSavingProfile] =
    useState(false);

  const [savingPassword, setSavingPassword] =
    useState(false);

  useEffect(() => {
    loadSettings();
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      setUser(user);

      const name =
        user.user_metadata?.full_name || '';

      setFullName(name);
      setProfileName(name);
    } catch (error) {
      console.error('Load user error:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const keys = [
        'notifications',
        'activityAlerts',
        'guestAlerts',
        'lockAlerts',
        'biometricLogin',
        'autoLock',
        'unlockConfirmation',
        'reduceMotion',
      ];

      const values = await AsyncStorage.multiGet(
        keys.map(
          (key) => `@securtap_${key}`
        )
      );

      values.forEach(([key, value]) => {
        if (value === null) {
          return;
        }

        const cleanKey = key.replace(
          '@securtap_',
          ''
        );

        const boolValue = value === 'true';

        switch (cleanKey) {
          case 'notifications':
            setNotifications(boolValue);
            break;

          case 'activityAlerts':
            setActivityAlerts(boolValue);
            break;

          case 'guestAlerts':
            setGuestAlerts(boolValue);
            break;

          case 'lockAlerts':
            setLockAlerts(boolValue);
            break;

          case 'biometricLogin':
            setBiometricLogin(boolValue);
            break;

          case 'autoLock':
            setAutoLock(boolValue);
            break;

          case 'unlockConfirmation':
            setUnlockConfirmation(boolValue);
            break;

          case 'reduceMotion':
            setReduceMotion(boolValue);
            break;
        }
      });
    } catch (error) {
      console.error(
        'Load settings error:',
        error
      );
    }
  };

  const saveBoolean = async (key, value) => {
    try {
      await AsyncStorage.setItem(
        `@securtap_${key}`,
        String(value)
      );
    } catch (error) {
      console.error(
        `Unable to save ${key}:`,
        error
      );
    }
  };

  const handleBiometric = async (value) => {
    if (!value) {
      setBiometricLogin(false);
      await saveBoolean(
        'biometricLogin',
        false
      );
      return;
    }

    try {
      const hasHardware =
        await LocalAuthentication.hasHardwareAsync();

      const enrolled =
        await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware) {
        Alert.alert(
          'Biometric Unavailable',
          'This phone does not have a supported biometric sensor.'
        );
        return;
      }

      if (!enrolled) {
        Alert.alert(
          'No Biometrics Enrolled',
          'Please register a fingerprint or face in your Android device settings first.'
        );
        return;
      }

      const result =
        await LocalAuthentication.authenticateAsync({
          promptMessage:
            'Confirm SECURTAP biometric login',
          cancelLabel: 'Cancel',
        });

      if (!result.success) {
        return;
      }

      setBiometricLogin(true);

      await saveBoolean(
        'biometricLogin',
        true
      );

      Alert.alert(
        'Biometric Login Enabled',
        'Your device biometric authentication is now enabled for SECURTAP.'
      );
    } catch (error) {
      console.error(
        'Biometric error:',
        error
      );

      Alert.alert(
        'Biometric Error',
        'Unable to configure biometric authentication on this device.'
      );
    }
  };

  const updateProfile = async () => {
    const cleanName = profileName.trim();

    if (!cleanName) {
      Alert.alert(
        'Invalid Name',
        'Please enter your name.'
      );
      return;
    }

    try {
      setSavingProfile(true);

      const { error } =
        await supabase.auth.updateUser({
          data: {
            full_name: cleanName,
          },
        });

      if (error) {
        throw error;
      }

      setFullName(cleanName);
      setProfileModal(false);

      Alert.alert(
        'Profile Updated',
        'Your profile has been updated.'
      );
    } catch (error) {
      Alert.alert(
        'Unable to Update Profile',
        getSupabaseErrorMessage(error)
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const updatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert(
        'Missing Information',
        'Enter and confirm your new password.'
      );
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        'Password Too Short',
        'Password must contain at least 6 characters.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        'Passwords Do Not Match',
        'Please enter the same password twice.'
      );
      return;
    }

    try {
      setSavingPassword(true);

      const { error } =
        await supabase.auth.updateUser({
          password: newPassword,
        });

      if (error) {
        throw error;
      }

      setNewPassword('');
      setConfirmPassword('');
      setPasswordModal(false);

      Alert.alert(
        'Password Changed',
        'Your SECURTAP password has been changed successfully.'
      );
    } catch (error) {
      Alert.alert(
        'Unable to Change Password',
        getSupabaseErrorMessage(error)
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSecurity = () => {
    Alert.alert(
      'Security',
      `Email: ${user?.email || 'Unknown'}\n\nAccount ID: ${
        user?.id || 'Unknown'
      }\n\nYour authentication is managed by Supabase Auth.`
    );
  };

  const handleDataStorage = () => {
    Alert.alert(
      'Data & Storage',
      'SECURTAP stores account, property, guest, smart-lock, and activity information in Supabase. Local app preferences are stored on this device.'
    );
  };

  const handlePrivacy = () => {
    Alert.alert(
      'Privacy',
      'SECURTAP only uses information needed for account management, property management, guest management, smart-lock management, and security logs.'
    );
  };

  const handleActivityLogs = () => {
    Alert.alert(
      'Activity Logs',
      'Activity log management is connected to the activity_logs table. Open the dashboard to review recent lock activity.'
    );
  };

  const handleDisplay = () => {
    Alert.alert(
      'Display',
      'Display settings are available below. Dark Mode and Reduce Motion are saved automatically.'
    );
  };

  const handleSupport = () => {
    Alert.alert(
      'Help & Support',
      'For support, check your Supabase logs and SECURTAP application logs. You can also report a problem below.'
    );
  };

  const handleReportProblem = () => {
    Alert.alert(
      'Report a Problem',
      'Please provide the error message and the screen where it occurred when reporting an issue.'
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About SECURTAP',
      'SECURTAP\nTwo-Factor Authentication Smart Lock System\n\nVersion 1.0.0'
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
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
  }) => (
    <TouchableOpacity
      style={[
        styles.row,
        { borderBottomColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rowIcon}>
        <Ionicons
          name={icon}
          size={21}
          color={colors.text}
        />
      </View>

      <View style={styles.rowContent}>
        <Text
          style={[
            styles.rowTitle,
            { color: colors.text },
          ]}
        >
          {title}
        </Text>

        {subtitle && (
          <Text
            style={[
              styles.rowSubtitle,
              { color: colors.secondaryText },
            ]}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {right}
    </TouchableOpacity>
  );

  const Toggle = ({
    value,
    onValueChange,
  }) => (
    <Switch
      value={value}
      onValueChange={onValueChange}
    />
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text
          style={[
            styles.title,
            { color: colors.text },
          ]}
        >
          Settings
        </Text>

        <Text
          style={[
            styles.email,
            { color: colors.secondaryText },
          ]}
        >
          {user?.email || 'Admin account'}
        </Text>

        {/* ACCOUNT */}

        <Text
          style={[
            styles.section,
            { color: colors.secondaryText },
          ]}
        >
          ACCOUNT
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card },
          ]}
        >
          <SettingRow
            icon="person-outline"
            title="Admin Profile"
            subtitle={
              fullName || 'Set your admin name'
            }
            onPress={() => setProfileModal(true)}
            right={
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.secondaryText}
              />
            }
          />

          <SettingRow
            icon="key-outline"
            title="Change Password"
            subtitle="Update your SECURTAP password"
            onPress={() => setPasswordModal(true)}
            right={
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.secondaryText}
              />
            }
          />

          <SettingRow
            icon="shield-checkmark-outline"
            title="Security"
            subtitle="View account security information"
            onPress={handleSecurity}
            right={
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.secondaryText}
              />
            }
          />

          <SettingRow
            icon="finger-print-outline"
            title="Biometric Login"
            subtitle={
              biometricLogin
                ? 'Enabled'
                : 'Disabled'
            }
            right={
              <Toggle
                value={biometricLogin}
                onValueChange={handleBiometric}
              />
            }
          />
        </View>

        {/* NOTIFICATIONS */}

        <Text
          style={[
            styles.section,
            { color: colors.secondaryText },
          ]}
        >
          NOTIFICATIONS
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card },
          ]}
        >
          <SettingRow
            icon="notifications-outline"
            title="Notifications"
            subtitle="Enable SECURTAP notifications"
            right={
              <Toggle
                value={notifications}
                onValueChange={(value) => {
                  setNotifications(value);
                  saveBoolean(
                    'notifications',
                    value
                  );
                }}
              />
            }
          />

          <SettingRow
            icon="pulse-outline"
            title="Activity Alerts"
            right={
              <Toggle
                value={activityAlerts}
                onValueChange={(value) => {
                  setActivityAlerts(value);
                  saveBoolean(
                    'activityAlerts',
                    value
                  );
                }}
              />
            }
          />

          <SettingRow
            icon="people-outline"
            title="Guest Alerts"
            right={
              <Toggle
                value={guestAlerts}
                onValueChange={(value) => {
                  setGuestAlerts(value);
                  saveBoolean(
                    'guestAlerts',
                    value
                  );
                }}
              />
            }
          />

          <SettingRow
            icon="lock-closed-outline"
            title="Lock Alerts"
            right={
              <Toggle
                value={lockAlerts}
                onValueChange={(value) => {
                  setLockAlerts(value);
                  saveBoolean(
                    'lockAlerts',
                    value
                  );
                }}
              />
            }
          />
        </View>

        {/* APPEARANCE */}

        <Text
          style={[
            styles.section,
            { color: colors.secondaryText },
          ]}
        >
          APPEARANCE
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card },
          ]}
        >
          <SettingRow
            icon="moon-outline"
            title="Dark Mode"
            subtitle={
              darkMode
                ? 'Dark theme enabled'
                : 'Light theme enabled'
            }
            right={
              <Toggle
                value={darkMode}
                onValueChange={setDarkMode}
              />
            }
          />

          <SettingRow
            icon="phone-portrait-outline"
            title="Display"
            subtitle="Display preferences"
            onPress={handleDisplay}
            right={
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.secondaryText}
              />
            }
          />

          <SettingRow
            icon="play-outline"
            title="Reduce Motion"
            subtitle="Reduce interface animations"
            right={
              <Toggle
                value={reduceMotion}
                onValueChange={(value) => {
                  setReduceMotion(value);
                  saveBoolean(
                    'reduceMotion',
                    value
                  );
                }}
              />
            }
          />
        </View>

        {/* LOCK & PROPERTY */}

        <Text
          style={[
            styles.section,
            { color: colors.secondaryText },
          ]}
        >
          LOCK & PROPERTY
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card },
          ]}
        >
          <SettingRow
            icon="lock-closed-outline"
            title="Lock Settings"
            subtitle="Smart-lock configuration"
            onPress={() =>
              navigation.navigate('Lock')
            }
            right={
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.secondaryText}
              />
            }
          />

          <SettingRow
            icon="card-outline"
            title="NFC Cards"
            subtitle="Manage NFC credentials"
            onPress={() =>
              navigation.navigate('Lock')
            }
            right={
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.secondaryText}
              />
            }
          />

          <SettingRow
            icon="finger-print-outline"
            title="Fingerprints"
            subtitle="Manage fingerprint credentials"
            onPress={() =>
              navigation.navigate('Lock')
            }
            right={
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.secondaryText}
              />
            }
          />

          <SettingRow
            icon="business-outline"
            title="Property Settings"
            subtitle="Manage properties"
            onPress={() =>
              navigation.navigate('Properties')
            }
            right={
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.secondaryText}
              />
            }
          />

          <SettingRow
            icon="timer-outline"
            title="Auto Lock"
            subtitle="Automatically secure locks"
            right={
              <Toggle
                value={autoLock}
                onValueChange={(value) => {
                  setAutoLock(value);
                  saveBoolean(
                    'autoLock',
                    value
                  );
                }}
              />
            }
          />

          <SettingRow
            icon="checkmark-circle-outline"
            title="Unlock Confirmation"
            subtitle="Confirm remote unlock actions"
            right={
              <Toggle
                value={unlockConfirmation}
                onValueChange={(value) => {
                  setUnlockConfirmation(value);
                  saveBoolean(
                    'unlockConfirmation',
                    value
                  );
                }}
              />
            }
          />
        </View>

        {/* DATA */}

        <Text
          style={[
            styles.section,
            { color: colors.secondaryText },
          ]}
        >
          DATA & PRIVACY
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card },
          ]}
        >
          <SettingRow
            icon="server-outline"
            title="Data & Storage"
            onPress={handleDataStorage}
            right={
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.secondaryText}
              />
            }
          />

          <SettingRow
            icon="list-outline"
            title="Activity Logs"
            onPress={handleActivityLogs}
            right={
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.secondaryText}
              />
            }
          />

          <SettingRow
            icon="eye-off-outline"
            title="Privacy"
            onPress={handlePrivacy}
            right={
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.secondaryText}
              />
            }
          />
        </View>

        {/* SUPPORT */}

        <Text
          style={[
            styles.section,
            { color: colors.secondaryText },
          ]}
        >
          SUPPORT
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card },
          ]}
        >
          <SettingRow
            icon="help-circle-outline"
            title="Help & Support"
            onPress={handleSupport}
            right={
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.secondaryText}
              />
            }
          />

          <SettingRow
            icon="bug-outline"
            title="Report a Problem"
            onPress={handleReportProblem}
            right={
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.secondaryText}
              />
            }
          />

          <SettingRow
            icon="information-circle-outline"
            title="About SECURTAP"
            onPress={handleAbout}
            right={
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.secondaryText}
              />
            }
          />
        </View>

        {/* LOGOUT */}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color="#fff"
          />

          <Text style={styles.logoutText}>
            Log Out
          </Text>
        </TouchableOpacity>

        <Text
          style={[
            styles.version,
            { color: colors.secondaryText },
          ]}
        >
          SECURTAP v1.0.0
        </Text>
      </ScrollView>

      {/* PROFILE MODAL */}

      <Modal
        visible={profileModal}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setProfileModal(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modal,
              { backgroundColor: colors.card },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                { color: colors.text },
              ]}
            >
              Admin Profile
            </Text>

            <Text
              style={[
                styles.modalLabel,
                { color: colors.text },
              ]}
            >
              Full Name
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.input,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={profileName}
              onChangeText={setProfileName}
              placeholder="Full name"
              placeholderTextColor={
                colors.secondaryText
              }
            />

            <Text
              style={[
                styles.boundEmail,
                { color: colors.secondaryText },
              ]}
            >
              Bound Gmail: {user?.email || 'Unknown'}
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={updateProfile}
              disabled={savingProfile}
            >
              {savingProfile ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Save Profile
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() =>
                setProfileModal(false)
              }
            >
              <Text
                style={[
                  styles.cancelText,
                  { color: colors.text },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PASSWORD MODAL */}

      <Modal
        visible={passwordModal}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setPasswordModal(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modal,
              { backgroundColor: colors.card },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                { color: colors.text },
              ]}
            >
              Change Password
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.input,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="New password"
              placeholderTextColor={
                colors.secondaryText
              }
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.input,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Confirm password"
              placeholderTextColor={
                colors.secondaryText
              }
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={updatePassword}
              disabled={savingPassword}
            >
              {savingPassword ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Update Password
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() =>
                setPasswordModal(false)
              }
            >
              <Text
                style={[
                  styles.cancelText,
                  { color: colors.text },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    padding: 20,
    paddingBottom: 110,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
  },

  email: {
    fontSize: 13,
    marginTop: 3,
    marginBottom: 20,
  },

  section: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 10,
  },

  card: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
  },

  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },

  rowIcon: {
    width: 35,
    alignItems: 'center',
  },

  rowContent: {
    flex: 1,
    marginLeft: 8,
  },

  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
  },

  rowSubtitle: {
    fontSize: 11,
    marginTop: 3,
  },

  logoutButton: {
    height: 52,
    backgroundColor: '#c62828',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },

  logoutText: {
    color: '#fff',
    fontWeight: '800',
    marginLeft: 8,
  },

  version: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 14,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },

  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 35,
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 18,
  },

  modalLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 7,
  },

  modalInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },

  boundEmail: {
    fontSize: 12,
    marginBottom: 15,
  },

  primaryButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },

  primaryButtonText: {
    color: '#fff',
    fontWeight: '800',
  },

  cancelButton: {
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelText: {
    fontWeight: '700',
  },
});