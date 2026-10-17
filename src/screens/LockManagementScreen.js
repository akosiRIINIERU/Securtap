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
import { invokeTuyaLock, summarizeLockStatus } from '../lib/tuya';
import { useTheme } from '../context/ThemeContext';
import { APP_NAME } from '../constants';

export default function LockManagementScreen() {
  const { colors } = useTheme();

  const [locks, setLocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddLock, setShowAddLock] = useState(false);
  const [lockName, setLockName] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [properties, setProperties] = useState([]);
  const [saving, setSaving] = useState(false);
  const [busyLockId, setBusyLockId] = useState('');

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
        .order('created_at', { ascending: false });

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
      console.error('Load lock properties error:', error);
    }
  };

  useEffect(() => {
    loadLocks();
    loadProperties();

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const persistLockStatus = async (lock, result) => {
    const summary = summarizeLockStatus(result?.status);
    const nextStatus = result?.online === false
      ? 'offline'
      : summary.locked === true
        ? 'locked'
        : summary.locked === false
          ? 'unlocked'
          : 'online';

    await supabase
      .from('smart_locks')
      .update({
        status: nextStatus,
      })
      .eq('id', lock.id);

    setLocks((current) =>
      current.map((item) =>
        item.id === lock.id
          ? {
              ...item,
              status: nextStatus,
              last_seen_at: result?.checkedAt,
              live: summary,
              online: result?.online,
            }
          : item
      )
    );
  };

  const connectLock = async (lock, action = 'status') => {
    if (!lock.device_id) {
      Alert.alert('Missing Device ID', 'This lock has no Tuya device ID.');
      return;
    }

    setBusyLockId(lock.id);

    try {
      const result = await invokeTuyaLock({
        action,
        deviceId: lock.device_id,
      });

      await persistLockStatus(lock, result);

      if (action === 'status') {
        Alert.alert(
          'Lock Connected',
          `${lock.name || 'Smart lock'} is reachable on Tuya.`
        );
      }
    } catch (error) {
      Alert.alert(
        action === 'status' ? 'Connection Failed' : 'Command Failed',
        error.message || getSupabaseErrorMessage(error)
      );
    } finally {
      setBusyLockId('');
    }
  };

  const confirmCommand = (lock, action) => {
    Alert.alert(
      action === 'unlock' ? 'Unlock Door?' : 'Lock Door?',
      `${action === 'unlock' ? 'Unlock' : 'Lock'} ${lock.name || 'this smart lock'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'unlock' ? 'Unlock' : 'Lock',
          onPress: () => connectLock(lock, action),
        },
      ]
    );
  };

  const registerLock = async () => {
    const cleanName = lockName.trim();
    const cleanDeviceId = deviceId.trim();

    if (!cleanName) {
      Alert.alert('Missing Lock Name', 'Enter a name for the smart lock.');
      return;
    }

    if (!cleanDeviceId) {
      Alert.alert('Missing Device ID', 'Enter the Tuya device ID.');
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
        Alert.alert('Session Expired', 'Please log in again.');
        return;
      }

      const { data, error } = await supabase
        .from('smart_locks')
        .insert({
          property_id: propertyId,
          name: cleanName,
          device_id: cleanDeviceId,
          provider: 'tuya',
          status: 'registered',
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setLockName('');
      setDeviceId('');
      setPropertyId('');
      setShowAddLock(false);
      await loadLocks();

      try {
        const result = await invokeTuyaLock({
          action: 'status',
          deviceId: cleanDeviceId,
        });

        await persistLockStatus(data, result);

        Alert.alert(
          'Smart Lock Connected',
          `${cleanName} is now linked to ${APP_NAME} and reachable on Tuya.`
        );
      } catch (connectError) {
        Alert.alert(
          'Saved, Connection Pending',
          `${cleanName} was saved, but Tuya did not respond yet.\n\n${connectError.message}`
        );
      }
    } catch (error) {
      console.error('Register smart lock error:', error);

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
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>
          Smart Lock
        </Text>

        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
          Connect your Tuya lock to {APP_NAME}
        </Text>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            loadProperties();
            setShowAddLock(true);
          }}
        >
          <Ionicons name="add-circle-outline" size={21} color="#fff" />
          <Text style={styles.addButtonText}>Connect Tuya Smart Lock</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.text}
            style={{ marginTop: 35 }}
          />
        ) : locks.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Ionicons
              name="lock-closed-outline"
              size={48}
              color={colors.secondaryText}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Connected Lock
            </Text>
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
              Add your premade Tuya smart lock using its device ID, then
              refresh status from this screen.
            </Text>
          </View>
        ) : (
          locks.map((lock) => {
            const busy = busyLockId === lock.id;
            const property = properties.find(
              (item) => item.id === lock.property_id
            );

            return (
              <View
                key={lock.id}
                style={[styles.lockCard, { backgroundColor: colors.card }]}
              >
                <View style={styles.lockTop}>
                  <View style={styles.lockIcon}>
                    <Ionicons
                      name={
                        lock.status === 'unlocked'
                          ? 'lock-open-outline'
                          : 'lock-closed-outline'
                      }
                      size={24}
                      color="#111"
                    />
                  </View>

                  <View style={styles.lockInfo}>
                    <Text style={[styles.lockName, { color: colors.text }]}>
                      {lock.name || 'Unnamed Lock'}
                    </Text>
                    <Text style={[styles.lockDevice, { color: colors.secondaryText }]}>
                      {property?.name ? `${property.name} · ` : ''}
                      {lock.device_id}
                    </Text>
                    <Text style={[styles.lockStatus, { color: colors.secondaryText }]}>
                      Status: {lock.status || 'Unknown'}
                      {lock.online === false ? ' · Offline' : ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.secondaryAction}
                    onPress={() => connectLock(lock, 'status')}
                    disabled={busy}
                  >
                    {busy ? (
                      <ActivityIndicator color="#111" />
                    ) : (
                      <Text style={styles.secondaryActionText}>Refresh</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryAction}
                    onPress={() => confirmCommand(lock, 'lock')}
                    disabled={busy}
                  >
                    <Text style={styles.secondaryActionText}>Lock</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.primaryAction}
                    onPress={() => confirmCommand(lock, 'unlock')}
                    disabled={busy}
                  >
                    <Text style={styles.primaryActionText}>Unlock</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={showAddLock}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddLock(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Connect Tuya Lock
              </Text>
              <TouchableOpacity onPress={() => setShowAddLock(false)}>
                <Ionicons name="close" size={25} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.text }]}>Lock Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.input,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Front door lock"
              placeholderTextColor={colors.secondaryText}
              value={lockName}
              onChangeText={setLockName}
            />

            <Text style={[styles.label, { color: colors.text }]}>
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
              placeholder="Device ID from Tuya IoT"
              placeholderTextColor={colors.secondaryText}
              value={deviceId}
              onChangeText={setDeviceId}
              autoCapitalize="none"
            />

            <Text style={[styles.label, { color: colors.text }]}>Property</Text>
            {properties.length === 0 ? (
              <Text style={{ color: colors.secondaryText, marginBottom: 15 }}>
                Add a property first, then connect this lock to it.
              </Text>
            ) : (
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
                      propertyId === property.id && styles.selectedChip,
                    ]}
                    onPress={() => setPropertyId(property.id)}
                  >
                    <Text
                      style={[
                        styles.propertyChipText,
                        propertyId === property.id && styles.selectedChipText,
                      ]}
                    >
                      {property.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.registerButton}
              onPress={registerLock}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerButtonText}>
                  Save and Connect
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
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 110 },
  title: { fontSize: 27, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4, marginBottom: 18 },
  addButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#111',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  addButtonText: { color: '#fff', fontWeight: '800', marginLeft: 7 },
  emptyCard: {
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    marginTop: 15,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 12 },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  lockCard: { borderRadius: 18, padding: 14, marginBottom: 12 },
  lockTop: { flexDirection: 'row', alignItems: 'center' },
  lockIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#e7e7e7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockInfo: { flex: 1, marginLeft: 12 },
  lockName: { fontSize: 15, fontWeight: '800' },
  lockDevice: { fontSize: 11, marginTop: 4 },
  lockStatus: { fontSize: 11, marginTop: 3 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  secondaryAction: {
    flex: 1,
    height: 42,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: { fontWeight: '700', color: '#111' },
  primaryAction: {
    flex: 1,
    height: 42,
    borderRadius: 11,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: { fontWeight: '700', color: '#fff' },
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
  modalTitle: { fontSize: 21, fontWeight: '800' },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 7 },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 15,
  },
  propertySelector: { marginBottom: 15 },
  propertyChip: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#e8e8e8',
    borderRadius: 20,
    marginRight: 8,
  },
  selectedChip: { backgroundColor: '#111' },
  propertyChipText: { color: '#333', fontWeight: '600', fontSize: 12 },
  selectedChipText: { color: '#fff' },
  registerButton: {
    height: 52,
    borderRadius: 13,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: { color: '#fff', fontWeight: '800' },
});
