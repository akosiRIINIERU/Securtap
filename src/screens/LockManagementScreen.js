import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  supabase,
  getSupabaseErrorMessage,
} from '../lib/supabase';

import { useTheme } from '../context/ThemeContext';

export default function LockManagementScreen() {
  const { colors } = useTheme();

  const [locks, setLocks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddLock, setShowAddLock] =
    useState(false);

  const [lockName, setLockName] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [propertyId, setPropertyId] =
    useState('');

  const [properties, setProperties] =
    useState([]);

  const [saving, setSaving] = useState(false);

  const loadLocks = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { data, error } = await supabase
        .from('smart_locks')
        .select('*')
        .order('created_at', {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setLocks(data || []);
    } catch (error) {
      console.error('Load locks error:', error);

      Alert.alert(
        'Unable to Load Locks',
        getSupabaseErrorMessage(error)
      );
    } finally {
      setLoading(false);
    }
  };

  const loadProperties = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .eq('admin_id', user.id)
        .order('name');

      if (error) {
        throw error;
      }

      setProperties(data || []);
    } catch (error) {
      console.error(
        'Load lock properties error:',
        error
      );
    }
  };

  useEffect(() => {
    loadLocks();
    loadProperties();

    // Again: .on() BEFORE .subscribe()
    const channel = supabase
      .channel('smart-locks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'smart_locks',
        },
        () => {
          loadLocks();
        }
      )
      .subscribe((status, error) => {
        console.log(
          'Smart locks realtime:',
          status
        );

        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT'
        ) {
          console.error(
            'Smart locks realtime error:',
            error
          );
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const registerLock = async () => {
    const cleanName = lockName.trim();
    const cleanDeviceId = deviceId.trim();

    if (!cleanName) {
      Alert.alert(
        'Missing Lock Name',
        'Enter a name for the smart lock.'
      );
      return;
    }

    if (!cleanDeviceId) {
      Alert.alert(
        'Missing Device ID',
        'Enter the Tuya device ID.'
      );
      return;
    }

    if (!propertyId) {
      Alert.alert(
        'Property Required',
        'Select the property where this lock is installed.'
      );
      return;
    }

    try {
      setSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert(
          'Session Expired',
          'Please log in again.'
        );
        return;
      }

      /*
       * This stores the Tuya device reference in
       * SECURTAP.
       *
       * The actual Tuya API call should happen
       * through a Supabase Edge Function so that
       * the Tuya Access Secret never reaches the
       * Android application.
       */
      const { error } = await supabase
        .from('smart_locks')
        .insert({
          property_id: propertyId,
          name: cleanName,
          device_id: cleanDeviceId,
          provider: 'tuya',
          status: 'registered',
        });

      if (error) {
        throw error;
      }

      setLockName('');
      setDeviceId('');
      setPropertyId('');
      setShowAddLock(false);

      await loadLocks();

      Alert.alert(
        'Smart Lock Registered',
        `${cleanName} has been added to SECURTAP.`
      );
    } catch (error) {
      console.error(
        'Register smart lock error:',
        error
      );

      Alert.alert(
        'Unable to Register Lock',
        getSupabaseErrorMessage(error)
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={[
            styles.title,
            { color: colors.text },
          ]}
        >
          Lock Management
        </Text>

        <Text
          style={[
            styles.subtitle,
            { color: colors.secondaryText },
          ]}
        >
          Manage your Tuya smart locks
        </Text>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            loadProperties();
            setShowAddLock(true);
          }}
        >
          <Ionicons
            name="add-circle-outline"
            size={21}
            color="#fff"
          />

          <Text style={styles.addButtonText}>
            Add Tuya Smart Lock
          </Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.text}
            style={{ marginTop: 35 }}
          />
        ) : locks.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.card },
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={48}
              color={colors.secondaryText}
            />

            <Text
              style={[
                styles.emptyTitle,
                { color: colors.text },
              ]}
            >
              No Smart Locks
            </Text>

            <Text
              style={[
                styles.emptyText,
                { color: colors.secondaryText },
              ]}
            >
              Add a Tuya smart lock to begin
              managing your locks.
            </Text>
          </View>
        ) : (
          locks.map((lock) => (
            <View
              key={lock.id}
              style={[
                styles.lockCard,
                { backgroundColor: colors.card },
              ]}
            >
              <View style={styles.lockIcon}>
                <Ionicons
                  name="lock-closed-outline"
                  size={24}
                  color="#111"
                />
              </View>

              <View style={styles.lockInfo}>
                <Text
                  style={[
                    styles.lockName,
                    { color: colors.text },
                  ]}
                >
                  {lock.name ||
                    lock.lock_name ||
                    'Unnamed Lock'}
                </Text>

                <Text
                  style={[
                    styles.lockDevice,
                    {
                      color:
                        colors.secondaryText,
                    },
                  ]}
                >
                  Tuya Device: {lock.device_id || 'N/A'}
                </Text>

                <Text
                  style={[
                    styles.lockStatus,
                    { color: colors.secondaryText },
                  ]}
                >
                  Status: {lock.status || 'Unknown'}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={showAddLock}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setShowAddLock(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modal,
              { backgroundColor: colors.card },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  { color: colors.text },
                ]}
              >
                Add Tuya Smart Lock
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setShowAddLock(false)
                }
              >
                <Ionicons
                  name="close"
                  size={25}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            <Text
              style={[
                styles.label,
                { color: colors.text },
              ]}
            >
              Lock Name
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.input,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="e.g. Airbnb 1 Smart Lock"
              placeholderTextColor={
                colors.secondaryText
              }
              value={lockName}
              onChangeText={setLockName}
            />

            <Text
              style={[
                styles.label,
                { color: colors.text },
              ]}
            >
              Tuya Device ID
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.input,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Enter Tuya device ID"
              placeholderTextColor={
                colors.secondaryText
              }
              value={deviceId}
              onChangeText={setDeviceId}
              autoCapitalize="none"
            />

            <Text
              style={[
                styles.label,
                { color: colors.text },
              ]}
            >
              Property
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.propertySelector}
            >
              {properties.map((property) => (
                <TouchableOpacity
                  key={property.id}
                  style={[
                    styles.propertyChip,
                    propertyId === property.id &&
                      styles.selectedChip,
                  ]}
                  onPress={() =>
                    setPropertyId(property.id)
                  }
                >
                  <Text
                    style={[
                      styles.propertyChipText,
                      propertyId === property.id &&
                        styles.selectedChipText,
                    ]}
                  >
                    {property.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.warningBox}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#555"
              />

              <Text style={styles.warningText}>
                Tuya API secrets are kept on the
                backend. This screen stores the
                Tuya device reference in SECURTAP.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={registerLock}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={styles.registerButtonText}
                >
                  Register Smart Lock
                </Text>
              )}
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
    fontSize: 27,
    fontWeight: '800',
  },

  subtitle: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 18,
  },

  addButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#111',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  addButtonText: {
    color: '#fff',
    fontWeight: '800',
    marginLeft: 7,
  },

  emptyCard: {
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    marginTop: 15,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
  },

  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },

  lockCard: {
    minHeight: 90,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  lockIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#e7e7e7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  lockInfo: {
    flex: 1,
    marginLeft: 12,
  },

  lockName: {
    fontSize: 15,
    fontWeight: '800',
  },

  lockDevice: {
    fontSize: 11,
    marginTop: 4,
  },

  lockStatus: {
    fontSize: 11,
    marginTop: 3,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },

  modal: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 22,
    paddingBottom: 35,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: '800',
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 7,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 15,
  },

  propertySelector: {
    marginBottom: 15,
  },

  propertyChip: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#e8e8e8',
    borderRadius: 20,
    marginRight: 8,
  },

  selectedChip: {
    backgroundColor: '#111',
  },

  propertyChipText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 12,
  },

  selectedChipText: {
    color: '#fff',
  },

  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#e9e9e9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
  },

  warningText: {
    flex: 1,
    marginLeft: 8,
    color: '#555',
    fontSize: 11,
    lineHeight: 17,
  },

  registerButton: {
    height: 52,
    borderRadius: 13,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },

  registerButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
});