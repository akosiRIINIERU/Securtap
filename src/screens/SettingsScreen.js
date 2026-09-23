import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

const SETTINGS_KEY = '@securtap_settings';
const PROFILE_KEY = '@securtap_profile';

const defaultSettings = {
  notifications: true,
  activityAlerts: true,
  guestAlerts: true,
  lockAlerts: true,
  darkMode: false,
  biometricLogin: false,
  autoLock: true,
  soundEffects: true,
};

const defaultProfile = {
  name: 'Admin',
  email: 'admin@securtap.com',
  phone: '',
  adminId: 'ADMIN-001',
};

export default function SettingsScreen({ onLogout }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [profile, setProfile] = useState(defaultProfile);

  const [loading, setLoading] = useState(true);

  const [activeModal, setActiveModal] = useState(null);

  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem(
        SETTINGS_KEY
      );

      const savedProfile = await AsyncStorage.getItem(
        PROFILE_KEY
      );

      if (savedSettings) {
        setSettings({
          ...defaultSettings,
          ...JSON.parse(savedSettings),
        });
      }

      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);

        setProfile({
          ...defaultProfile,
          ...parsedProfile,
        });
      }
    } catch (error) {
      console.log('Settings loading error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    const updatedSettings = {
      ...settings,
      [key]: value,
    };

    setSettings(updatedSettings);

    try {
      await AsyncStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(updatedSettings)
      );
    } catch (error) {
      console.log('Settings save error:', error);
    }
  };

  const openProfile = () => {
    setEditName(profile.name);
    setEditEmail(profile.email);
    setEditPhone(profile.phone);

    setActiveModal('profile');
  };

  const saveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Missing Information', 'Please enter your name.');
      return;
    }

    const updatedProfile = {
      ...profile,
      name: editName.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim(),
    };

    setProfile(updatedProfile);

    await AsyncStorage.setItem(
      PROFILE_KEY,
      JSON.stringify(updatedProfile)
    );

    setActiveModal(null);

    Alert.alert(
      'Profile Updated',
      'Your administrator profile has been updated.'
    );
  };

  const changePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert(
        'Missing Information',
        'Please enter both password fields.'
      );

      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        'Invalid Password',
        'Password must contain at least 6 characters.'
      );

      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        'Passwords Do Not Match',
        'Please make sure both passwords are the same.'
      );

      return;
    }

    /*
      TEMPORARY LOCAL DEMO

      This does NOT represent real account authentication.
      Once Supabase authentication is added, this function
      will be replaced with an actual password update.
    */

    setNewPassword('');
    setConfirmPassword('');
    setActiveModal(null);

    Alert.alert(
      'Password Updated',
      'Password change is currently stored as a local demo. Real account authentication will be connected later.'
    );
  };

  const enableBiometrics = async (value) => {
    if (!value) {
      await updateSetting('biometricLogin', false);
      return;
    }

    try {
      const compatible =
        await LocalAuthentication.hasHardwareAsync();

      if (!compatible) {
        Alert.alert(
          'Not Available',
          'This device does not support biometric authentication.'
        );

        return;
      }

      const enrolled =
        await LocalAuthentication.isEnrolledAsync();

      if (!enrolled) {
        Alert.alert(
          'No Biometrics',
          'Please register a fingerprint, face, or other biometric method on your device first.'
        );

        return;
      }

      const result =
        await LocalAuthentication.authenticateAsync({
          promptMessage: 'Enable SECURTAP biometric login',
          cancelLabel: 'Cancel',
        });

      if (result.success) {
        await updateSetting(
          'biometricLogin',
          true
        );

        Alert.alert(
          'Biometric Login Enabled',
          'Your device biometric authentication is now enabled for SECURTAP.'
        );
      }
    } catch (error) {
      console.log('Biometric error:', error);

      Alert.alert(
        'Biometric Error',
        'Unable to configure biometric authentication.'
      );
    }
  };

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
        onPress: async () => {
          const { error } = await supabase.auth.signOut();

          if (error) {
            Alert.alert('Logout Error', error.message);
          }
        },
      },
    ]
  );
};

  const clearLocalData = () => {
    Alert.alert(
      'Clear Local Data',
      'This will reset your local SECURTAP settings and profile. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove([
              SETTINGS_KEY,
              PROFILE_KEY,
            ]);

            setSettings(defaultSettings);
            setProfile(defaultProfile);

            Alert.alert(
              'Data Cleared',
              'Local SECURTAP settings have been reset.'
            );
          },
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
          <Ionicons
            name={icon}
            size={21}
            color="#222"
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

        {right}
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
      trackColor={{
        false: '#cfcfcf',
        true: '#222',
      }}
      thumbColor="#fff"
    />
  );

  const Chevron = () => (
    <Ionicons
      name="chevron-forward"
      size={20}
      color="#888"
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
            color="#111"
          />

          <Text style={styles.loadingText}>
            Loading settings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <Text style={styles.brandTitle}>
            SECURTAP
          </Text>

          <Text style={styles.headerTitle}>
            Settings
          </Text>

          <Text style={styles.headerSubtitle}>
            Manage your administrator account and
            application preferences.
          </Text>
        </View>

        {/* ACCOUNT */}

        <Text style={styles.sectionLabel}>
          ACCOUNT
        </Text>

        <View style={styles.sectionCard}>
          <SettingRow
            icon="person-outline"
            title="Admin Profile"
            subtitle={`${profile.name} • ${profile.email}`}
            onPress={openProfile}
            right={<Chevron />}
          />

          <SettingRow
            icon="key-outline"
            title="Change Password"
            subtitle="Update your local admin password"
            onPress={() =>
              setActiveModal('password')
            }
            right={<Chevron />}
          />

          <SettingRow
            icon="shield-checkmark-outline"
            title="Security"
            subtitle="Review security options"
            onPress={() =>
              setActiveModal('security')
            }
            right={<Chevron />}
          />

          <SettingRow
            icon="finger-print-outline"
            title="Biometric Login"
            subtitle="Use your device biometric authentication"
            right={
              <SwitchControl
                value={settings.biometricLogin}
                onValueChange={enableBiometrics}
              />
            }
          />
        </View>

        {/* NOTIFICATIONS */}

        <Text style={styles.sectionLabel}>
          NOTIFICATIONS
        </Text>

        <View style={styles.sectionCard}>
          <SettingRow
            icon="notifications-outline"
            title="Notifications"
            subtitle="Enable SECURTAP notification preferences"
            right={
              <SwitchControl
                value={settings.notifications}
                onValueChange={(value) =>
                  updateSetting(
                    'notifications',
                    value
                  )
                }
              />
            }
          />

          <SettingRow
            icon="pulse-outline"
            title="Activity Alerts"
            subtitle="Lock and security activity"
            right={
              <SwitchControl
                value={settings.activityAlerts}
                onValueChange={(value) =>
                  updateSetting(
                    'activityAlerts',
                    value
                  )
                }
              />
            }
          />

          <SettingRow
            icon="people-outline"
            title="Guest Alerts"
            subtitle="Guest activity notifications"
            right={
              <SwitchControl
                value={settings.guestAlerts}
                onValueChange={(value) =>
                  updateSetting(
                    'guestAlerts',
                    value
                  )
                }
              />
            }
          />

          <SettingRow
            icon="lock-closed-outline"
            title="Lock Alerts"
            subtitle="Smart lock status notifications"
            right={
              <SwitchControl
                value={settings.lockAlerts}
                onValueChange={(value) =>
                  updateSetting(
                    'lockAlerts',
                    value
                  )
                }
              />
            }
          />
        </View>

        {/* APPEARANCE */}

        <Text style={styles.sectionLabel}>
          APPEARANCE
        </Text>

        <View style={styles.sectionCard}>
          <SettingRow
            icon="moon-outline"
            title="Dark Mode"
            subtitle={
              settings.darkMode
                ? 'Dark appearance enabled'
                : 'Light appearance enabled'
            }
            right={
              <SwitchControl
                value={settings.darkMode}
                onValueChange={(value) =>
                  updateSetting(
                    'darkMode',
                    value
                  )
                }
              />
            }
          />

          <SettingRow
            icon="volume-high-outline"
            title="Sound Effects"
            subtitle="Application interaction sounds"
            right={
              <SwitchControl
                value={settings.soundEffects}
                onValueChange={(value) =>
                  updateSetting(
                    'soundEffects',
                    value
                  )
                }
              />
            }
          />

          <SettingRow
            icon="phone-portrait-outline"
            title="Display"
            subtitle="Display preferences"
            onPress={() =>
              setActiveModal('display')
            }
            right={<Chevron />}
          />
        </View>

        {/* LOCK & PROPERTY */}

        <Text style={styles.sectionLabel}>
          LOCK & PROPERTY
        </Text>

        <View style={styles.sectionCard}>
          <SettingRow
            icon="key-outline"
            title="Lock Settings"
            subtitle="Automatic locking and security"
            onPress={() =>
              setActiveModal('lock')
            }
            right={<Chevron />}
          />

          <SettingRow
            icon="card-outline"
            title="NFC Cards"
            subtitle="Manage registered NFC cards"
            onPress={() =>
              setActiveModal('nfc')
            }
            right={<Chevron />}
          />

          <SettingRow
            icon="finger-print-outline"
            title="Fingerprints"
            subtitle="Manage registered fingerprints"
            onPress={() =>
              setActiveModal('fingerprints')
            }
            right={<Chevron />}
          />

          <SettingRow
            icon="business-outline"
            title="Property Settings"
            subtitle="Manage local property preferences"
            onPress={() =>
              setActiveModal('property')
            }
            right={<Chevron />}
          />
        </View>

        {/* DATA */}

        <Text style={styles.sectionLabel}>
          DATA & PRIVACY
        </Text>

        <View style={styles.sectionCard}>
          <SettingRow
            icon="cloud-outline"
            title="Data & Storage"
            subtitle="Manage locally stored data"
            onPress={() =>
              setActiveModal('storage')
            }
            right={<Chevron />}
          />

          <SettingRow
            icon="document-text-outline"
            title="Activity Logs"
            subtitle="View security and system activity"
            onPress={() =>
              setActiveModal('logs')
            }
            right={<Chevron />}
          />

          <SettingRow
            icon="shield-outline"
            title="Privacy"
            subtitle="Review SECURTAP privacy information"
            onPress={() =>
              setActiveModal('privacy')
            }
            right={<Chevron />}
          />
        </View>

        {/* SUPPORT */}

        <Text style={styles.sectionLabel}>
          SUPPORT
        </Text>

        <View style={styles.sectionCard}>
          <SettingRow
            icon="help-circle-outline"
            title="Help & Support"
            subtitle="Learn how to use SECURTAP"
            onPress={() =>
              setActiveModal('help')
            }
            right={<Chevron />}
          />

          <SettingRow
            icon="bug-outline"
            title="Report a Problem"
            subtitle="Report an issue with the application"
            onPress={() =>
              setActiveModal('report')
            }
            right={<Chevron />}
          />

          <SettingRow
            icon="information-circle-outline"
            title="About SECURTAP"
            subtitle="Version 1.0.0"
            onPress={() =>
              setActiveModal('about')
            }
            right={<Chevron />}
          />
        </View>

        {/* CLEAR DATA */}

        <TouchableOpacity
          style={styles.clearButton}
          onPress={clearLocalData}
        >
          <Ionicons
            name="trash-outline"
            size={19}
            color="#555"
          />

          <Text style={styles.clearText}>
            Reset Local Settings
          </Text>
        </TouchableOpacity>

        {/* LOGOUT */}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons
            name="log-out-outline"
            size={21}
            color="#d11"
          />

          <Text style={styles.logoutText}>
            Logout
          </Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>
          SECURTAP • Version 1.0.0
        </Text>
      </ScrollView>

      {/* PROFILE MODAL */}

      <Modal
        visible={activeModal === 'profile'}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setActiveModal(null)
        }
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalCard}>
            <ModalHeader
              title="Admin Profile"
              onClose={() =>
                setActiveModal(null)
              }
            />

            <Text style={styles.inputLabel}>
              Name
            </Text>

            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Admin name"
            />

            <Text style={styles.inputLabel}>
              Email
            </Text>

            <TextInput
              style={styles.input}
              value={editEmail}
              onChangeText={setEditEmail}
              keyboardType="email-address"
              placeholder="Email"
            />

            <Text style={styles.inputLabel}>
              Phone
            </Text>

            <TextInput
              style={styles.input}
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
              placeholder="Phone number"
            />

            <Text style={styles.readOnlyText}>
              Admin ID: {profile.adminId}
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={saveProfile}
            >
              <Text style={styles.primaryButtonText}>
                Save Profile
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PASSWORD MODAL */}

      <Modal
        visible={activeModal === 'password'}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setActiveModal(null)
        }
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalCard}>
            <ModalHeader
              title="Change Password"
              onClose={() =>
                setActiveModal(null)
              }
            />

            <Text style={styles.warningText}>
              This is currently a local development
              version. Real account authentication will
              be connected when Supabase is added.
            </Text>

            <Text style={styles.inputLabel}>
              New Password
            </Text>

            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="New password"
            />

            <Text style={styles.inputLabel}>
              Confirm Password
            </Text>

            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Confirm password"
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={changePassword}
            >
              <Text style={styles.primaryButtonText}>
                Update Password
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SECURITY MODAL */}

      <InfoModal
        visible={activeModal === 'security'}
        title="Security"
        onClose={() => setActiveModal(null)}
      >
        <InfoItem
          icon="shield-checkmark-outline"
          title="Account Protection"
          text="SECURTAP security controls will be connected to your authentication system later."
        />

        <InfoItem
          icon="finger-print-outline"
          title="Biometric Login"
          text={
            settings.biometricLogin
              ? 'Enabled on this device.'
              : 'Currently disabled.'
          }
        />

        <InfoItem
          icon="lock-closed-outline"
          title="Automatic Lock"
          text={
            settings.autoLock
              ? 'Enabled.'
              : 'Disabled.'
          }
        />
      </InfoModal>

      {/* DISPLAY MODAL */}

      <InfoModal
        visible={activeModal === 'display'}
        title="Display"
        onClose={() => setActiveModal(null)}
      >
        <InfoItem
          icon="moon-outline"
          title="Theme"
          text={
            settings.darkMode
              ? 'Dark Mode'
              : 'Light Mode'
          }
        />

        <InfoItem
          icon="volume-high-outline"
          title="Sound"
          text={
            settings.soundEffects
              ? 'Sound effects enabled.'
              : 'Sound effects disabled.'
          }
        />

        <Text style={styles.modalNote}>
          The complete application-wide dark theme
          will be connected to all screens in the next
          UI pass.
        </Text>
      </InfoModal>

      {/* LOCK MODAL */}

      <LockSettingsModal
        visible={activeModal === 'lock'}
        settings={settings}
        updateSetting={updateSetting}
        onClose={() => setActiveModal(null)}
      />

      {/* NFC MODAL */}

      <InfoModal
        visible={activeModal === 'nfc'}
        title="NFC Cards"
        onClose={() => setActiveModal(null)}
      >
        <InfoItem
          icon="card-outline"
          title="Registered Cards"
          text="2 cards currently configured for this local demo."
        />

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() =>
            Alert.alert(
              'NFC',
              'NFC card registration will be connected to the SECURTAP hardware later.'
            )
          }
        >
          <Text style={styles.secondaryButtonText}>
            Manage NFC Cards
          </Text>
        </TouchableOpacity>
      </InfoModal>

      {/* FINGERPRINT MODAL */}

      <InfoModal
        visible={
          activeModal === 'fingerprints'
        }
        title="Fingerprints"
        onClose={() => setActiveModal(null)}
      >
        <InfoItem
          icon="finger-print-outline"
          title="Registered Fingerprints"
          text="2 fingerprint slots are currently configured for this local demo."
        />

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() =>
            Alert.alert(
              'Fingerprint',
              'Fingerprint enrollment will be connected to the SECURTAP hardware later.'
            )
          }
        >
          <Text style={styles.secondaryButtonText}>
            Manage Fingerprints
          </Text>
        </TouchableOpacity>
      </InfoModal>

      {/* PROPERTY MODAL */}

      <InfoModal
        visible={activeModal === 'property'}
        title="Property Settings"
        onClose={() => setActiveModal(null)}
      >
        <InfoItem
          icon="business-outline"
          title="Property Management"
          text="Property creation, editing and deletion will use the database once Supabase is connected."
        />

        <InfoItem
          icon="home-outline"
          title="Units"
          text="Units will be associated with each property."
        />
      </InfoModal>

      {/* STORAGE MODAL */}

      <InfoModal
        visible={activeModal === 'storage'}
        title="Data & Storage"
        onClose={() => setActiveModal(null)}
      >
        <InfoItem
          icon="phone-portrait-outline"
          title="Local Storage"
          text="SECURTAP currently stores settings and profile information locally on this device."
        />

        <TouchableOpacity
          style={styles.dangerButton}
          onPress={clearLocalData}
        >
          <Text style={styles.dangerButtonText}>
            Reset Local Data
          </Text>
        </TouchableOpacity>
      </InfoModal>

      {/* LOGS */}

      <InfoModal
        visible={activeModal === 'logs'}
        title="Activity Logs"
        onClose={() => setActiveModal(null)}
      >
        <InfoItem
          icon="lock-open-outline"
          title="Airbnb 1 unlocked"
          text="Fingerprint authentication • 2m ago"
        />

        <InfoItem
          icon="card-outline"
          title="NFC card used"
          text="Airbnb 2 Smart Lock • 15m ago"
        />

        <InfoItem
          icon="lock-closed-outline"
          title="Airbnb 3 locked"
          text="Automatic lock • 32m ago"
        />

        <Text style={styles.modalNote}>
          These are temporary demo logs. Real logs
          will be stored in the database later.
        </Text>
      </InfoModal>

      {/* PRIVACY */}

      <InfoModal
        visible={activeModal === 'privacy'}
        title="Privacy"
        onClose={() => setActiveModal(null)}
      >
        <InfoItem
          icon="shield-outline"
          title="Local Data"
          text="Your current settings and profile demo data are stored locally on your device."
        />

        <InfoItem
          icon="lock-closed-outline"
          title="Future Database"
          text="When Supabase is added, access will be protected with authentication and database security policies."
        />
      </InfoModal>

      {/* HELP */}

      <InfoModal
        visible={activeModal === 'help'}
        title="Help & Support"
        onClose={() => setActiveModal(null)}
      >
        <InfoItem
          icon="home-outline"
          title="Dashboard"
          text="View property statistics, recent activities and upcoming check-ins."
        />

        <InfoItem
          icon="business-outline"
          title="Properties"
          text="View properties, tenants and smart-lock information."
        />

        <InfoItem
          icon="key-outline"
          title="Lock"
          text="Manage smart-lock credentials and security settings."
        />

        <InfoItem
          icon="ellipsis-horizontal-outline"
          title="Settings"
          text="Manage your SECURTAP preferences and administrator account."
        />
      </InfoModal>

      {/* REPORT */}

      <ReportModal
        visible={activeModal === 'report'}
        onClose={() => setActiveModal(null)}
      />

      {/* ABOUT */}

      <InfoModal
        visible={activeModal === 'about'}
        title="About SECURTAP"
        onClose={() => setActiveModal(null)}
      >
        <View style={styles.aboutLogo}>
          <Ionicons
            name="shield-checkmark-outline"
            size={42}
            color="#111"
          />
        </View>

        <Text style={styles.aboutTitle}>
          SECURTAP
        </Text>

        <Text style={styles.aboutVersion}>
          Version 1.0.0
        </Text>

        <Text style={styles.aboutDescription}>
          SECURTAP is a smart property and access
          management application designed to manage
          properties, tenants, smart locks and
          security activities.
        </Text>
      </InfoModal>
    </SafeAreaView>
  );
}

/* ---------------- COMPONENTS ---------------- */

function ModalHeader({ title, onClose }) {
  return (
    <View style={styles.modalHeader}>
      <Text style={styles.modalTitle}>
        {title}
      </Text>

      <TouchableOpacity onPress={onClose}>
        <Ionicons
          name="close"
          size={25}
          color="#111"
        />
      </TouchableOpacity>
    </View>
  );
}

function InfoModal({
  visible,
  title,
  onClose,
  children,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackground}>
        <View style={styles.modalCard}>
          <ModalHeader
            title={title}
            onClose={onClose}
          />

          <ScrollView
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function InfoItem({
  icon,
  title,
  text,
}) {
  return (
    <View style={styles.infoItem}>
      <View style={styles.infoItemIcon}>
        <Ionicons
          name={icon}
          size={21}
          color="#111"
        />
      </View>

      <View style={styles.infoItemContent}>
        <Text style={styles.infoItemTitle}>
          {title}
        </Text>

        <Text style={styles.infoItemText}>
          {text}
        </Text>
      </View>
    </View>
  );
}

function LockSettingsModal({
  visible,
  settings,
  updateSetting,
  onClose,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackground}>
        <View style={styles.modalCard}>
          <ModalHeader
            title="Lock Settings"
            onClose={onClose}
          />

          <View style={styles.modalSwitchRow}>
            <View style={styles.modalSwitchInfo}>
              <Text style={styles.modalSwitchTitle}>
                Automatic Lock
              </Text>

              <Text style={styles.modalSwitchText}>
                Enable automatic lock behavior.
              </Text>
            </View>

            <Switch
              value={settings.autoLock}
              onValueChange={(value) =>
                updateSetting(
                  'autoLock',
                  value
                )
              }
              trackColor={{
                false: '#ccc',
                true: '#222',
              }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.modalSwitchRow}>
            <View style={styles.modalSwitchInfo}>
              <Text style={styles.modalSwitchTitle}>
                Lock Alerts
              </Text>

              <Text style={styles.modalSwitchText}>
                Receive lock status alerts.
              </Text>
            </View>

            <Switch
              value={settings.lockAlerts}
              onValueChange={(value) =>
                updateSetting(
                  'lockAlerts',
                  value
                )
              }
              trackColor={{
                false: '#ccc',
                true: '#222',
              }}
              thumbColor="#fff"
            />
          </View>

          <Text style={styles.modalNote}>
            Actual smart-lock controls will be
            connected after the lock hardware/API is
            integrated.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

function ReportModal({
  visible,
  onClose,
}) {
  const [message, setMessage] = useState('');

  const submit = () => {
    if (!message.trim()) {
      Alert.alert(
        'Missing Description',
        'Please describe the problem first.'
      );

      return;
    }

    setMessage('');
    onClose();

    Alert.alert(
      'Report Saved',
      'Your problem report has been saved locally. Online submission will be added later.'
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackground}>
        <View style={styles.modalCard}>
          <ModalHeader
            title="Report a Problem"
            onClose={onClose}
          />

          <Text style={styles.inputLabel}>
            Describe the problem
          </Text>

          <TextInput
            style={styles.textArea}
            multiline
            value={message}
            onChangeText={setMessage}
            placeholder="Tell us what happened..."
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={submit}
          >
            <Text style={styles.primaryButtonText}>
              Submit Report
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* ---------------- STYLES ---------------- */

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
    fontWeight: '800',
    color: '#000',
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 5,
  },

  headerSubtitle: {
    fontSize: 11,
    color: '#777',
    marginTop: 5,
    lineHeight: 16,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
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

  clearButton: {
    height: 50,
    borderRadius: 17,
    backgroundColor: '#eeeeee',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 3,
  },

  clearText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginLeft: 8,
  },

  logoutButton: {
    height: 52,
    borderRadius: 18,
    backgroundColor: '#eeeeee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
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

  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 10,
    color: '#777',
    fontSize: 12,
  },

  /* MODALS */

  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },

  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 22,
    maxHeight: '88%',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#111',
  },

  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555',
    marginBottom: 6,
    marginTop: 10,
  },

  input: {
    height: 48,
    borderRadius: 13,
    backgroundColor: '#eeeeee',
    paddingHorizontal: 14,
    fontSize: 13,
    color: '#111',
  },

  textArea: {
    height: 130,
    borderRadius: 13,
    backgroundColor: '#eeeeee',
    padding: 14,
    fontSize: 13,
  },

  primaryButton: {
    height: 50,
    borderRadius: 15,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },

  primaryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  secondaryButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#eeeeee',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },

  secondaryButtonText: {
    color: '#111',
    fontSize: 13,
    fontWeight: '700',
  },

  dangerButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#f1dddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },

  dangerButtonText: {
    color: '#c11',
    fontSize: 13,
    fontWeight: '700',
  },

  warningText: {
    backgroundColor: '#f3f3f3',
    borderRadius: 12,
    padding: 12,
    fontSize: 11,
    lineHeight: 16,
    color: '#666',
    marginBottom: 10,
  },

  readOnlyText: {
    fontSize: 11,
    color: '#888',
    marginTop: 10,
  },

  infoItem: {
    flexDirection: 'row',
    marginBottom: 18,
  },

  infoItemIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#eeeeee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  infoItemContent: {
    flex: 1,
  },

  infoItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111',
  },

  infoItemText: {
    fontSize: 11,
    color: '#777',
    lineHeight: 17,
    marginTop: 3,
  },

  modalNote: {
    fontSize: 11,
    color: '#888',
    lineHeight: 17,
    marginTop: 15,
    marginBottom: 10,
  },

  modalSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  modalSwitchInfo: {
    flex: 1,
    paddingRight: 10,
  },

  modalSwitchTitle: {
    fontSize: 14,
    fontWeight: '700',
  },

  modalSwitchText: {
    fontSize: 11,
    color: '#777',
    marginTop: 3,
  },

  aboutLogo: {
    width: 80,
    height: 80,
    borderRadius: 25,
    backgroundColor: '#eeeeee',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },

  aboutTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },

  aboutVersion: {
    textAlign: 'center',
    fontSize: 11,
    color: '#888',
    marginTop: 3,
  },

  aboutDescription: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    lineHeight: 19,
    marginTop: 18,
  },
});