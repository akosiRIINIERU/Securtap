import React, { useCallback, useEffect, useRef, useState } from 'react';
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

const PIN_DURATIONS = [
  { label: '1 hour', hours: 1 },
  { label: '24 hours', hours: 24 },
  { label: '7 days', hours: 168 },
  { label: '30 days', hours: 720 },
];

const LOCK_COLUMNS = [
  'id',
  'property_id',
  'unit_id',
  'lock_name',
  'provider',
  'device_id',
  'device_name',
  'lock_model',
  'status',
  'battery_level',
  'auto_lock_enabled',
  'auto_lock_seconds',
  'last_seen_at',
  'created_at',
  'updated_at',
  'tuya_device_id',
  'tuya_device_name',
  'tuya_product_id',
  'tuya_region',
  'last_synced_at',
].join(', ');

export default function LockManagementScreen() {
  const { colors } = useTheme();

  const [locks, setLocks] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyLockId, setBusyLockId] = useState('');
  const [showAddLock, setShowAddLock] = useState(false);
  const [selectedLock, setSelectedLock] = useState(null);
  const [passcodes, setPasscodes] = useState([]);
  const [newPin, setNewPin] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [pinLabel, setPinLabel] = useState('');
  const [pinHours, setPinHours] = useState(24);
  const locksRef = useRef([]);

  // Keep the latest lock list available to the background poll without
  // rebuilding the timer or realtime subscription whenever status changes.
  useEffect(() => {
    locksRef.current = locks;
  }, [locks]);

  const [lockName, setLockName] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [propertyId, setPropertyId] = useState('');

  const loadLocks = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setLocks([]);
        return;
      }

      const { data, error } = await supabase
        .from('smart_locks')
        .select(LOCK_COLUMNS)
        .order('created_at', { ascending: false });

      if (error) throw error;

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
  }, []);

  const loadProperties = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setProperties([]);
        return;
      }

      const { data, error } = await supabase
        .from('properties')
        .select('id, property_name, name')
        .order('property_name', { ascending: true });

      if (error) throw error;

      setProperties(data || []);
    } catch (error) {
      console.error('Load lock properties error:', error);

      Alert.alert(
        'Unable to Load Properties',
        getSupabaseErrorMessage(error)
      );
    }
  }, []);

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
          // Refresh data silently; don't replace the screen with a spinner.
          loadLocks({ silent: true });
        }
      )
      .subscribe();

    // Background-only refresh. Keep the existing list interactive while data updates.
    let pollInProgress = false;
    const poll = setInterval(async () => {
      if (pollInProgress) return;
      pollInProgress = true;
      try {
        // Refresh lock metadata silently without triggering the initial loading UI.
        await loadLocks({ silent: true });
        for (const lock of locksRef.current) {
          const id = lock.device_id || lock.tuya_device_id;
          if (!id) continue;
          try {
            const result = await invokeTuyaLock({ action: 'status', deviceId: id });
            await persistLockStatus(lock, result);
          } catch (e) {
            console.warn('Automatic lock status check failed:', lock.id, e?.message);
          }
        }
      } finally {
        pollInProgress = false;
      }
    }, 8000);

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [loadLocks, loadProperties]);

  const persistLockStatus = async (lock, result) => {
    const summary = summarizeLockStatus(result?.status);

    const nextStatus =
      result?.online === false
        ? 'offline'
        : summary.locked === true
          ? 'locked'
          : summary.locked === false
            ? 'unlocked'
            : 'online';

    const checkedAt =
      result?.checkedAt || new Date().toISOString();

    const updatedAt = new Date().toISOString();

    const { error } = await supabase
      .from('smart_locks')
      .update({
        status: nextStatus,
        last_seen_at: checkedAt,
        updated_at: updatedAt,
      })
      .eq('id', lock.id);

    if (error) throw error;

    setLocks((current) =>
      current.map((item) =>
        item.id === lock.id
          ? {
              ...item,
              status: nextStatus,
              last_seen_at: checkedAt,
              updated_at: updatedAt,
              live: summary,
              online: result?.online,
            }
          : item
      )
    );
  };

  const connectLock = async (lock, action = 'status') => {
    const tuyaDeviceId =
      lock.device_id || lock.tuya_device_id;

    if (!tuyaDeviceId) {
      Alert.alert(
        'Missing Device ID',
        'This lock has no Tuya device ID. Register it with a valid device ID before connecting.'
      );
      return;
    }

    setBusyLockId(lock.id);

    try {
      const result = await invokeTuyaLock({
        action,
        deviceId: tuyaDeviceId,
      });

      await persistLockStatus(lock, result);

      if (action === 'status') {
        Alert.alert(
          'Lock Status Refreshed',
          `${lock.lock_name || 'Smart lock'} status has been refreshed.`
        );
      } else {
        Alert.alert(
          'Command Sent',
          `The ${action} command was sent to ${lock.lock_name || 'the smart lock'}. Refresh status to confirm the result.`
        );
      }
    } catch (error) {
      console.error('Tuya lock operation error:', error);

      Alert.alert(
        action === 'status'
          ? 'Connection Failed'
          : 'Command Failed',
        error?.message || getSupabaseErrorMessage(error)
      );
    } finally {
      setBusyLockId('');
    }
  };



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
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        Alert.alert(
          'Session Expired',
          'Please log in again.'
        );
        return;
      }

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('smart_locks')
        .insert({
          property_id: propertyId,
          lock_name: cleanName,
          device_id: cleanDeviceId,
          device_name: cleanName,
          provider: 'tuya',
          status: 'offline',
          auto_lock_enabled: false,
          created_at: now,
          updated_at: now,
        })
        .select(LOCK_COLUMNS)
        .single();

      if (error) throw error;

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
          `${cleanName} was saved and Tuya responded successfully.`
        );
      } catch (connectError) {
        console.error(
          'Initial Tuya status check failed:',
          connectError
        );

        Alert.alert(
          'Lock Saved — Connection Pending',
          `${cleanName} was saved, but its initial Tuya status check failed.\n\n${connectError?.message || 'Check the Tuya Edge Function and device configuration.'}`
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

  const reloadPins = async (lock) => {
    const { data, error } = await supabase
      .from('lock_passcodes')
      .select('id, label, passcode, status, valid_from, valid_until, created_at, guest_id, tuya_password_id')
      .eq('lock_id', lock.id)
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('Unable to load PINs', getSupabaseErrorMessage(error));
      setPasscodes([]);
    } else {
      setPasscodes(data || []);
    }
  };

  const openLockDetails = async (lock) => {
    setSelectedLock(lock);
    setNewPin('');
    setPinLabel('');
    setPinHours(24);
    await reloadPins(lock);
  };

  const activePins = passcodes.filter(
    (p) =>
      p.status === 'active' &&
      (!p.valid_until || new Date(p.valid_until).getTime() > Date.now())
  );

  // Runs a PIN action on the Tuya lock through the Edge Function.
  const runPinAction = async (params, failTitle) => {
    const deviceId = selectedLock?.device_id || selectedLock?.tuya_device_id;

    if (!deviceId) {
      Alert.alert('Missing Device ID', 'This lock has no Tuya device ID.');
      return null;
    }

    setPinBusy(true);

    try {
      const result = await invokeTuyaLock({ deviceId, ...params });
      await reloadPins(selectedLock);
      return result;
    } catch (e) {
      Alert.alert(failTitle, e?.message || getSupabaseErrorMessage(e));
      return null;
    } finally {
      setPinBusy(false);
    }
  };

  const createPin = async () => {
    const now = Date.now();
    const result = await runPinAction(
      {
        action: 'pin_create',
        label: pinLabel.trim() || 'Guest PIN',
        validFrom: new Date(now).toISOString(),
        validUntil: new Date(now + pinHours * 3600 * 1000).toISOString(),
      },
      'Unable to create PIN'
    );

    if (result?.pin) {
      setNewPin(result.pin);
      setPinLabel('');
    }
  };

  const extendPin = async (pinRow) => {
    const base = pinRow.valid_until
      ? Math.max(new Date(pinRow.valid_until).getTime(), Date.now())
      : Date.now();

    const result = await runPinAction(
      {
        action: 'pin_modify',
        passcodeId: pinRow.id,
        validUntil: new Date(base + 24 * 3600 * 1000).toISOString(),
      },
      'Unable to extend PIN'
    );

    if (result?.success) {
      Alert.alert('PIN updated', 'The new expiry was sent to the lock.');
    }
  };

  const regeneratePin = (pinRow) => {
    Alert.alert(
      'Generate a new PIN?',
      `"${pinRow.label}" gets a new PIN with the same expiry. The old PIN stops working.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            const result = await runPinAction(
              { action: 'pin_regenerate', passcodeId: pinRow.id },
              'Unable to regenerate PIN'
            );

            if (result?.pin) setNewPin(result.pin);
          },
        },
      ]
    );
  };

  const revokePin = (pinRow) => {
    Alert.alert(
      'Revoke PIN?',
      'This deletes the PIN from the lock so it can no longer open the door.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            await runPinAction(
              { action: 'pin_revoke', passcodeId: pinRow.id },
              'Unable to revoke PIN'
            );
          },
        },
      ]
    );
  };

  const resetAllPins = () => {
    Alert.alert(
      'Reset all PINs?',
      'This clears every temporary PIN on this lock. Fingerprints, cards and the lock\'s own admin code are not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset all',
          style: 'destructive',
          onPress: async () => {
            setNewPin('');
            await runPinAction(
              { action: 'pin_reset_all' },
              'Unable to reset PINs'
            );
          },
        },
      ]
    );
  };

  const removeLock = (lock) => Alert.alert('Remove lock from SECURTAP?', 'This removes the database record and associated PIN/NFC/fingerprint records according to your foreign-key rules. It does not unpair the lock from Tuya or erase credentials on the physical lock.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove record', style: 'destructive', onPress: async () => {
      const { error } = await supabase.from('smart_locks').delete().eq('id', lock.id);
      if (error) Alert.alert('Unable to remove lock', getSupabaseErrorMessage(error));
      else { setSelectedLock(null); await loadLocks(); }
    } },
  ]);

  const getPropertyName = (property) =>
    property?.property_name ||
    property?.name ||
    'Unnamed Property';

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
        <Text style={[styles.title, { color: colors.text }]}>
          Smart Lock
        </Text>

        <Text
          style={[
            styles.subtitle,
            { color: colors.secondaryText },
          ]}
        >
          Connect your Tuya lock to {APP_NAME}
        </Text>

        <TouchableOpacity
          style={styles.addButton}
          onPress={async () => {
            await loadProperties();
            setShowAddLock(true);
          }}
        >
          <Ionicons
            name="add-circle-outline"
            size={21}
            color="#fff"
          />
          <Text style={styles.addButtonText}>
            Connect Tuya Smart Lock
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
              No Connected Lock
            </Text>

            <Text
              style={[
                styles.emptyText,
                { color: colors.secondaryText },
              ]}
            >
              Add your Tuya smart lock using its device ID. Status updates automatically in the background.
            </Text>
          </View>
        ) : (
          locks.map((lock) => {
            const busy = busyLockId === lock.id;

            const property = properties.find(
              (item) => item.id === lock.property_id
            );

            const displayedDeviceId =
              lock.device_id ||
              lock.tuya_device_id ||
              'No device ID';

            const displayedStatus =
              lock.status || 'Unknown';

            return (
              <View
                key={lock.id}
                style={[
                  styles.lockCard,
                  { backgroundColor: colors.card },
                ]}
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
                    <Text
                      style={[
                        styles.lockName,
                        { color: colors.text },
                      ]}
                    >
                      {lock.lock_name || 'Unnamed Lock'}
                    </Text>

                    <Text
                      style={[
                        styles.lockDevice,
                        { color: colors.secondaryText },
                      ]}
                    >
                      {property
                        ? `${getPropertyName(property)} · `
                        : ''}
                      {displayedDeviceId}
                    </Text>

                    <Text
                      style={[
                        styles.lockStatus,
                        { color: colors.secondaryText },
                      ]}
                    >
                      Status: {displayedStatus}
                      {lock.online === false ? ' · Offline' : ''}
                    </Text>

                    {lock.battery_level != null && (
                      <Text
                        style={[
                          styles.lockDevice,
                          { color: colors.secondaryText },
                        ]}
                      >
                        Battery: {lock.battery_level}%
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.primaryAction} onPress={() => openLockDetails(lock)}>
                    <Text style={styles.primaryActionText}>Manage</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.secondaryAction, { borderColor: '#b42318' }]} onPress={() => removeLock(lock)}>
                    <Text style={[styles.secondaryActionText, { color: '#b42318' }]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={!!selectedLock} transparent animationType="slide" onRequestClose={() => setSelectedLock(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedLock?.lock_name || 'Lock details'}</Text>
              <TouchableOpacity onPress={() => setSelectedLock(null)}><Ionicons name="close" size={25} color={colors.text} /></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[styles.lockDevice, { color: colors.secondaryText }]}>Device: {selectedLock?.device_id || selectedLock?.tuya_device_id || 'Not configured'}</Text>
              <Text style={[styles.lockDevice, { color: colors.secondaryText }]}>Status: {selectedLock?.status || 'Unknown'} · Battery: {selectedLock?.battery_level == null ? 'Unknown' : `${selectedLock.battery_level}%`}</Text>

              <Text style={[styles.sectionHeading, { color: colors.text }]}>New PIN</Text>
              {newPin ? (
                <View style={[styles.pinReveal, { borderColor: colors.border }]}>
                  <Text style={{ color: colors.secondaryText, fontSize: 12 }}>Sent to the lock. Share this PIN with your guest:</Text>
                  <Text selectable style={[styles.pinValue, { color: colors.text }]}>{newPin}</Text>
                </View>
              ) : null}
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
                placeholder="Label (e.g. Guest - Room 2)"
                placeholderTextColor={colors.secondaryText}
                value={pinLabel}
                onChangeText={setPinLabel}
                editable={!pinBusy}
                maxLength={60}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.propertySelector}>
                {PIN_DURATIONS.map((option) => (
                  <TouchableOpacity
                    key={option.hours}
                    style={[styles.propertyChip, pinHours === option.hours && styles.selectedChip]}
                    onPress={() => setPinHours(option.hours)}
                    disabled={pinBusy}
                  >
                    <Text style={[styles.propertyChipText, pinHours === option.hours && styles.selectedChipText]}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={[styles.registerButton, pinBusy && styles.disabledButton]} onPress={createPin} disabled={pinBusy}>
                {pinBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerButtonText}>Generate PIN and send to lock</Text>}
              </TouchableOpacity>

              <Text style={[styles.sectionHeading, { color: colors.text }]}>Active PINs</Text>
              {activePins.length === 0 ? (
                <Text style={{ color: colors.secondaryText }}>No active PINs.</Text>
              ) : (
                activePins.map((p) => (
                  <View key={p.id} style={[styles.pinRow, { alignItems: 'flex-start' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '700' }}>{p.label}</Text>
                      <Text style={{ color: colors.secondaryText }}>{p.passcode}</Text>
                      <Text style={{ color: colors.secondaryText, fontSize: 11, marginTop: 2 }}>
                        {p.tuya_password_id ? 'On lock' : 'Not on lock (old record)'} · until {p.valid_until ? new Date(p.valid_until).toLocaleString() : 'no expiry'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 8 }}>
                      {p.tuya_password_id ? (
                        <>
                          <TouchableOpacity disabled={pinBusy} onPress={() => extendPin(p)}>
                            <Text style={{ color: colors.text, fontWeight: '700' }}>+24h</Text>
                          </TouchableOpacity>
                          <TouchableOpacity disabled={pinBusy} onPress={() => regeneratePin(p)}>
                            <Text style={{ color: colors.text, fontWeight: '700' }}>New PIN</Text>
                          </TouchableOpacity>
                        </>
                      ) : null}
                      <TouchableOpacity disabled={pinBusy} onPress={() => revokePin(p)}>
                        <Text style={{ color: '#b42318', fontWeight: '700' }}>Revoke</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              <TouchableOpacity style={[styles.secondaryAction, { borderColor: '#b42318', marginTop: 16, flex: 0 }]} onPress={resetAllPins} disabled={pinBusy}>
                <Text style={[styles.secondaryActionText, { color: '#b42318' }]}>Reset all PINs on this lock</Text>
              </TouchableOpacity>

              <Text style={{ color: colors.secondaryText, fontSize: 11, marginTop: 14 }}>
                PINs expire on the lock automatically at their end time. NFC card and fingerprint enrollment are not available yet; this screen does not simulate them.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAddLock}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddLock(false)}
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
                Connect Tuya Lock
              </Text>

              <TouchableOpacity
                onPress={() => setShowAddLock(false)}
              >
                <Ionicons
                  name="close"
                  size={25}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.text }]}>
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
              placeholder="Front door lock"
              placeholderTextColor={colors.secondaryText}
              value={lockName}
              onChangeText={setLockName}
              editable={!saving}
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
              autoCorrect={false}
              editable={!saving}
            />

            <Text style={[styles.label, { color: colors.text }]}>
              Property
            </Text>

            {properties.length === 0 ? (
              <Text
                style={{
                  color: colors.secondaryText,
                  marginBottom: 15,
                }}
              >
                No properties found. Create a property first or check
                your Supabase access policies.
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
                      propertyId === property.id &&
                        styles.selectedChip,
                    ]}
                    onPress={() => setPropertyId(property.id)}
                    disabled={saving}
                  >
                    <Text
                      style={[
                        styles.propertyChipText,
                        propertyId === property.id &&
                          styles.selectedChipText,
                      ]}
                    >
                      {getPropertyName(property)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[
                styles.registerButton,
                saving && styles.disabledButton,
              ]}
              onPress={registerLock}
              disabled={saving || properties.length === 0}
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
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  lockTop: {
    flexDirection: 'row',
    alignItems: 'center',
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
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  secondaryActionText: {
    fontWeight: '700',
    color: '#111',
  },
  primaryAction: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  primaryActionText: {
    fontWeight: '700',
    color: '#fff',
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
    maxHeight: '90%',
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
  sectionHeading: { fontSize: 15, fontWeight: '800', marginTop: 18, marginBottom: 8 },
  pinReveal: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12, alignItems: 'center' },
  pinValue: { fontSize: 30, fontWeight: '800', letterSpacing: 4, marginTop: 4 },
  pinRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#999' },
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
    maxHeight: 48,
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
  registerButton: {
    height: 52,
    borderRadius: 13,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
});