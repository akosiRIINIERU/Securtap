import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function LockManagementScreen() {
  const [locks, setLocks] = useState([]);
  const [passcodes, setPasscodes] = useState({});
  const [visiblePasscodes, setVisiblePasscodes] = useState({});
  const [loading, setLoading] = useState(true);

  const loadLocks = async () => {
    try {
      const { data: locksData, error: locksError } =
        await supabase
          .from('smart_locks')
          .select('*')
          .order('created_at', { ascending: false });

      if (locksError) {
        console.log(locksError);
        return;
      }

      setLocks(locksData || []);

      if (!locksData?.length) {
        setLoading(false);
        return;
      }

      const lockIds = locksData.map(
        lock => lock.lock_id
      );

      const { data: passcodeData, error: passcodeError } =
        await supabase
          .from('lock_passcodes')
          .select('*')
          .in('lock_id', lockIds)
          .eq('is_active', true);

      if (passcodeError) {
        console.log(passcodeError);
        return;
      }

      const passcodeMap = {};

      (passcodeData || []).forEach(item => {
        passcodeMap[item.lock_id] = item;
      });

      setPasscodes(passcodeMap);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocks();

    const channel = supabase
      .channel('locks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'smart_locks',
        },
        loadLocks
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lock_passcodes',
        },
        loadLocks
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const togglePasscode = lockId => {
    setVisiblePasscodes(previous => ({
      ...previous,
      [lockId]: !previous[lockId],
    }));
  };

  const resetPasscode = async lockId => {
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
            const { error } = await supabase
              .from('lock_passcodes')
              .update({
                is_active: false,
              })
              .eq('lock_id', lockId)
              .eq('is_active', true);

            if (error) {
              Alert.alert('Error', error.message);
              return;
            }

            loadLocks();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.brandTitle}>SECURTAP</Text>
        <Text style={styles.welcomeSub}>
          Lock Management
        </Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#000"
            style={{ marginTop: 30 }}
          />
        ) : locks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="lock-closed-outline"
              size={42}
              color="#777"
            />

            <Text style={styles.emptyTitle}>
              No Smart Locks
            </Text>

            <Text style={styles.emptyText}>
              No smart locks have been registered yet.
            </Text>
          </View>
        ) : (
          locks.map(lock => {
            const passcode = passcodes[lock.lock_id];

            return (
              <View
                key={lock.lock_id}
                style={styles.mainCard}
              >
                <View style={styles.lockHeader}>
                  <View style={styles.lockIcon}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={24}
                      color="#111"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardHeader}>
                      {lock.lock_name}
                    </Text>

                    <Text style={styles.status}>
                      Status:{' '}
                      {lock.status || 'Unknown'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.sectionTitle}>
                  Access Credentials
                </Text>

                <Text style={styles.fieldLabel}>
                  Passcode
                </Text>

                <View style={styles.passcodeRow}>
                  <TextInput
                    style={styles.passcodeInput}
                    value={
                      passcode
                        ? visiblePasscodes[lock.lock_id]
                          ? String(passcode.passcode)
                          : '••••••'
                        : 'No active passcode'
                    }
                    editable={false}
                    secureTextEntry={false}
                  />

                  {passcode && (
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() =>
                        togglePasscode(lock.lock_id)
                      }
                    >
                      <Ionicons
                        name={
                          visiblePasscodes[lock.lock_id]
                            ? 'eye-off-outline'
                            : 'eye-outline'
                        }
                        size={21}
                        color="#111"
                      />
                    </TouchableOpacity>
                  )}

                  {passcode && (
                    <TouchableOpacity
                      onPress={() =>
                        resetPasscode(lock.lock_id)
                      }
                    >
                      <Text style={styles.resetText}>
                        Reset
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {passcode?.expires_at && (
                  <Text style={styles.updatedText}>
                    Expires:{' '}
                    {new Date(
                      passcode.expires_at
                    ).toLocaleString()}
                  </Text>
                )}

                <View style={styles.divider} />

                <Text style={styles.fieldLabel}>
                  NFC
                </Text>

                <View style={styles.manageRow}>
                  <Text style={styles.registeredText}>
                    Registered Cards
                  </Text>

                  <Text style={styles.countText}>
                    —
                  </Text>
                </View>

                <View style={styles.divider} />

                <Text style={styles.fieldLabel}>
                  Fingerprint
                </Text>

                <View style={styles.manageRow}>
                  <Text style={styles.registeredText}>
                    Registered Fingerprints
                  </Text>

                  <Text style={styles.countText}>
                    —
                  </Text>
                </View>
              </View>
            );
          })
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

  content: {
    padding: 20,
    paddingBottom: 110,
  },

  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
  },

  welcomeSub: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },

  mainCard: {
    backgroundColor: '#eeeeee',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
  },

  lockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  lockIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  cardHeader: {
    fontSize: 16,
    fontWeight: '800',
  },

  status: {
    fontSize: 11,
    color: '#666',
    marginTop: 3,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 10,
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },

  passcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },

  passcodeInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 12,
    fontSize: 13,
  },

  eyeButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -42,
  },

  resetText: {
    fontSize: 11,
    marginLeft: 12,
    color: '#333',
    fontWeight: '600',
  },

  updatedText: {
    fontSize: 10,
    color: '#666',
    marginTop: 5,
  },

  divider: {
    height: 1,
    backgroundColor: '#d3d3d3',
    marginVertical: 14,
  },

  manageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },

  registeredText: {
    fontSize: 11,
    color: '#333',
  },

  countText: {
    fontSize: 12,
    fontWeight: '700',
  },

  emptyCard: {
    backgroundColor: '#eeeeee',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },

  emptyText: {
    color: '#777',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
});