import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  RefreshControl,
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

export default function LockManagementScreen() {
  const [locks, setLocks] = useState([]);
  const [passcodes, setPasscodes] = useState([]);

  const [selectedLock, setSelectedLock] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [visiblePasscodes, setVisiblePasscodes] =
    useState({});

  const [newPasscode, setNewPasscode] =
    useState('');

  const [saving, setSaving] = useState(false);

  const loadLocks = useCallback(async () => {
    try {
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

      if (
        data?.length > 0 &&
        !selectedLock
      ) {
        setSelectedLock(data[0]);
      }

    } catch (error) {
      console.error(
        'Lock loading error:',
        error
      );

      Alert.alert(
        'Lock Error',
        getSupabaseErrorMessage(error)
      );
    }
  }, [selectedLock]);

  const loadPasscodes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('lock_passcodes')
        .select('*')
        .order('created_at', {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setPasscodes(data || []);
    } catch (error) {
      console.error(
        'Passcode loading error:',
        error
      );

      Alert.alert(
        'Passcode Error',
        getSupabaseErrorMessage(error)
      );
    }
  }, []);

  const loadData = useCallback(async () => {
    await Promise.all([
      loadLocks(),
      loadPasscodes(),
    ]);
  }, [loadLocks, loadPasscodes]);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);

      try {
        await loadData();
      } finally {
        setLoading(false);
      }
    };

    initialize();

    const channel = supabase
      .channel('lock-management-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'smart_locks',
        },
        loadData
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lock_passcodes',
        },
        loadData
      )
      .subscribe((status, error) => {
        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT'
        ) {
          console.error(
            'Lock realtime error:',
            error
          );
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const togglePasscode = (id) => {
    setVisiblePasscodes((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  const getLockPasscodes = () => {
    if (!selectedLock) {
      return [];
    }

    return passcodes.filter(
      (passcode) =>
        passcode.lock_id === selectedLock.id
    );
  };

  const handleResetPasscode = async (
    passcodeId
  ) => {
    Alert.alert(
      'Reset Passcode',
      'Are you sure you want to deactivate this passcode?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('lock_passcodes')
                .update({
                  is_active: false,
                })
                .eq('id', passcodeId);

              if (error) {
                throw error;
              }

              Alert.alert(
                'Success',
                'Passcode has been reset.'
              );

              await loadPasscodes();

            } catch (error) {
              console.error(
                'Reset passcode error:',
                error
              );

              Alert.alert(
                'Unable to Reset Passcode',
                getSupabaseErrorMessage(error)
              );
            }
          },
        },
      ]
    );
  };

  const handleSavePasscode = async () => {
    if (!selectedLock) {
      Alert.alert(
        'No Lock Selected',
        'Please select a smart lock first.'
      );
      return;
    }

    if (!newPasscode.trim()) {
      Alert.alert(
        'Missing Passcode',
        'Please enter a passcode.'
      );
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('lock_passcodes')
        .insert({
          lock_id: selectedLock.id,
          passcode: newPasscode.trim(),
          is_active: true,
        });

      if (error) {
        throw error;
      }

      Alert.alert(
        'Success',
        'New passcode has been created.'
      );

      setNewPasscode('');

      await loadPasscodes();

    } catch (error) {
      console.error(
        'Create passcode error:',
        error
      );

      Alert.alert(
        'Unable to Create Passcode',
        getSupabaseErrorMessage(error)
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="#111"
        />

        <Text style={styles.loadingText}>
          Loading lock management...
        </Text>
      </SafeAreaView>
    );
  }

  const selectedPasscodes =
    getLockPasscodes();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >

        <Text style={styles.brandTitle}>
          SECURTAP
        </Text>

        <Text style={styles.welcomeSub}>
          Lock Management
        </Text>

        <View style={styles.mainCard}>

          <Text style={styles.cardHeader}>
            SMART LOCKS
          </Text>

          {locks.length === 0 ? (
            <Text style={styles.emptyText}>
              No smart locks registered.
            </Text>
          ) : (
            locks.map((lock) => (
              <TouchableOpacity
                key={lock.id}
                style={[
                  styles.lockItem,
                  selectedLock?.id === lock.id &&
                    styles.selectedLock,
                ]}
                onPress={() =>
                  setSelectedLock(lock)
                }
              >
                <View style={styles.lockIcon}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={22}
                    color="#111"
                  />
                </View>

                <View style={styles.lockInfo}>
                  <Text style={styles.lockName}>
                    {lock.name ||
                      'Smart Lock'}
                  </Text>

                  <Text style={styles.lockStatus}>
                    Status:{' '}
                    {lock.status ||
                      'Unknown'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}

        </View>

        {selectedLock && (
          <View style={styles.mainCard}>

            <Text style={styles.cardHeader}>
              ACCESS CREDENTIALS
            </Text>

            <Text style={styles.subText}>
              Lock Name:{' '}
              {selectedLock.name ||
                'Smart Lock'}
            </Text>

            <Text style={styles.subText}>
              Status:{' '}
              {selectedLock.status ||
                'Unknown'}
            </Text>

            <Text style={styles.sectionTitle}>
              Passcodes
            </Text>

            {selectedPasscodes.length === 0 ? (
              <Text style={styles.emptyText}>
                No passcodes registered.
              </Text>
            ) : (
              selectedPasscodes.map(
                (passcode) => (
                  <View
                    key={passcode.id}
                    style={styles.passcodeCard}
                  >
                    <View
                      style={styles.passcodeInfo}
                    >
                      <Text
                        style={
                          styles.passcodeLabel
                        }
                      >
                        Passcode
                      </Text>

                      <TextInput
                        style={
                          styles.passcodeInput
                        }
                        value={
                          visiblePasscodes[
                            passcode.id
                          ]
                            ? passcode.passcode ||
                              ''
                            : '••••••'
                        }
                        editable={false}
                        secureTextEntry={false}
                      />
                    </View>

                    <TouchableOpacity
                      onPress={() =>
                        togglePasscode(
                          passcode.id
                        )
                      }
                      style={
                        styles.eyeButton
                      }
                    >
                      <Ionicons
                        name={
                          visiblePasscodes[
                            passcode.id
                          ]
                            ? 'eye-off-outline'
                            : 'eye-outline'
                        }
                        size={23}
                        color="#111"
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() =>
                        handleResetPasscode(
                          passcode.id
                        )
                      }
                      style={
                        styles.resetButton
                      }
                    >
                      <Text
                        style={
                          styles.resetText
                        }
                      >
                        Reset
                      </Text>
                    </TouchableOpacity>
                  </View>
                )
              )
            )}

            <Text style={styles.sectionTitle}>
              Create New Passcode
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter new passcode"
              placeholderTextColor="#999"
              value={newPasscode}
              onChangeText={setNewPasscode}
              secureTextEntry
              editable={!saving}
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSavePasscode}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={styles.saveButtonText}
                >
                  Save Passcode
                </Text>
              )}
            </TouchableOpacity>

          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    color: '#666',
  },

  content: {
    padding: 20,
    paddingBottom: 100,
  },

  brandTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: '#111',
  },

  welcomeSub: {
    fontSize: 15,
    color: '#777',
    marginTop: 4,
    marginBottom: 20,
  },

  mainCard: {
    backgroundColor: '#f4f4f4',
    borderRadius: 20,
    padding: 18,
    marginBottom: 15,
  },

  cardHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111',
    marginBottom: 15,
  },

  lockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#fff',
    marginBottom: 8,
  },

  selectedLock: {
    borderWidth: 1,
    borderColor: '#111',
  },

  lockIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#f2f2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  lockInfo: {
    marginLeft: 12,
  },

  lockName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },

  lockStatus: {
    fontSize: 12,
    color: '#777',
    marginTop: 3,
  },

  subText: {
    color: '#555',
    fontSize: 13,
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111',
    marginTop: 18,
    marginBottom: 10,
  },

  passcodeCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 12,
    marginBottom: 10,
  },

  passcodeInfo: {
    marginBottom: 8,
  },

  passcodeLabel: {
    fontSize: 12,
    color: '#777',
    marginBottom: 5,
  },

  passcodeInput: {
    height: 45,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 11,
    paddingHorizontal: 12,
    color: '#111',
  },

  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 35,
  },

  resetButton: {
    alignSelf: 'flex-end',
    marginTop: 5,
  },

  resetText: {
    color: '#b00020',
    fontWeight: '700',
  },

  input: {
    height: 52,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 13,
    paddingHorizontal: 14,
    color: '#111',
  },

  saveButton: {
    height: 52,
    backgroundColor: '#111',
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },

  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
  },

  emptyText: {
    color: '#777',
    textAlign: 'center',
    paddingVertical: 15,
  },
});