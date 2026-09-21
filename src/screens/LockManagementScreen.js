import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function LockManagementScreen() {
  const [passcode, setPasscode] = useState('');

  const handleUnlock = () => {
    Alert.alert(
      'Smart Lock',
      'Tuya unlock command will be connected here.'
    );
  };

  const handleLock = () => {
    Alert.alert(
      'Smart Lock',
      'Tuya lock command will be connected here.'
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandTitle}>SECURTAP</Text>
            <Text style={styles.welcomeSub}>Lock Management</Text>
          </View>

          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />

            <Text style={styles.onlineText}>ONLINE</Text>
          </View>
        </View>

        {/* LOCK CARD */}
        <View style={styles.lockCard}>
          <View style={styles.lockHeader}>
            <View>
              <Text style={styles.lockName}>
                AIRBNB 1 Smart Lock
              </Text>

              <Text style={styles.lockSubtext}>
                Tuya Smart Lock
              </Text>
            </View>

            <View style={styles.lockIcon}>
              <Ionicons
                name="lock-closed"
                size={25}
                color="#111"
              />
            </View>
          </View>

          {/* LOCK STATUS */}
          <View style={styles.lockStatus}>
            <Ionicons
              name="lock-closed-outline"
              size={45}
              color="#111"
            />

            <Text style={styles.lockedText}>LOCKED</Text>

            <Text style={styles.lastUpdated}>
              Last updated: June xx, xxxx
            </Text>
          </View>

          {/* CONTROLS */}
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={styles.unlockButton}
              onPress={handleUnlock}
            >
              <Ionicons
                name="lock-open-outline"
                size={19}
                color="#fff"
              />

              <Text style={styles.unlockText}>Unlock</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.lockButton}
              onPress={handleLock}
            >
              <Ionicons
                name="lock-closed-outline"
                size={19}
                color="#111"
              />

              <Text style={styles.lockText}>Lock</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ACCESS CREDENTIALS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            Access Credentials
          </Text>

          {/* PASSCODE */}
          <Text style={styles.fieldLabel}>Passcode</Text>

          <View style={styles.passcodeRow}>
            <TextInput
              style={styles.passcodeInput}
              value={passcode}
              onChangeText={setPasscode}
              placeholder="Enter passcode"
              placeholderTextColor="#999"
              secureTextEntry
              keyboardType="numeric"
            />

            <TouchableOpacity>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.updatedText}>
            Last Updated: June xx, xxxx
          </Text>

          {/* NFC */}
          <View style={styles.credentialRow}>
            <View style={styles.credentialIcon}>
              <Ionicons
                name="card-outline"
                size={21}
                color="#111"
              />
            </View>

            <View style={styles.credentialInfo}>
              <Text style={styles.credentialTitle}>NFC</Text>

              <Text style={styles.credentialSubtext}>
                Registered Cards: 2
              </Text>
            </View>

            <TouchableOpacity style={styles.manageButton}>
              <Text style={styles.manageText}>Manage</Text>
            </TouchableOpacity>
          </View>

          {/* FINGERPRINT */}
          <View style={styles.credentialRow}>
            <View style={styles.credentialIcon}>
              <Ionicons
                name="finger-print-outline"
                size={22}
                color="#111"
              />
            </View>

            <View style={styles.credentialInfo}>
              <Text style={styles.credentialTitle}>
                Fingerprint
              </Text>

              <Text style={styles.credentialSubtext}>
                Registered Fingerprints: 2
              </Text>
            </View>

            <TouchableOpacity style={styles.manageButton}>
              <Text style={styles.manageText}>Manage</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ACTIVITY */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Lock Activity
            </Text>

            <TouchableOpacity>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activityRow}>
            <Ionicons
              name="finger-print-outline"
              size={20}
              color="#111"
            />

            <View style={styles.activityInfo}>
              <Text style={styles.activityTitle}>
                Fingerprint used
              </Text>

              <Text style={styles.activitySubtext}>
                Door unlocked
              </Text>
            </View>

            <Text style={styles.activityTime}>2m ago</Text>
          </View>

          <View style={styles.activityRow}>
            <Ionicons
              name="card-outline"
              size={20}
              color="#111"
            />

            <View style={styles.activityInfo}>
              <Text style={styles.activityTitle}>
                NFC card used
              </Text>

              <Text style={styles.activitySubtext}>
                Door unlocked
              </Text>
            </View>

            <Text style={styles.activityTime}>15m ago</Text>
          </View>
        </View>
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
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 110,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  brandTitle: {
    fontSize: 21,
    fontWeight: '800',
  },

  welcomeSub: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },

  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eeeeee',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
  },

  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#555',
    marginRight: 5,
  },

  onlineText: {
    fontSize: 9,
    fontWeight: '800',
  },

  lockCard: {
    backgroundColor: '#eeeeee',
    borderRadius: 20,
    padding: 18,
    marginTop: 25,
  },

  lockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  lockName: {
    fontSize: 15,
    fontWeight: '800',
  },

  lockSubtext: {
    fontSize: 10,
    color: '#777',
    marginTop: 3,
  },

  lockIcon: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  lockStatus: {
    backgroundColor: '#fff',
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 23,
    marginTop: 15,
  },

  lockedText: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 7,
  },

  lastUpdated: {
    fontSize: 9,
    color: '#888',
    marginTop: 4,
  },

  controlRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },

  unlockButton: {
    flex: 1,
    height: 45,
    borderRadius: 13,
    backgroundColor: '#111',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  unlockText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 6,
  },

  lockButton: {
    flex: 1,
    height: 45,
    borderRadius: 13,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  lockText: {
    color: '#111',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 6,
  },

  sectionCard: {
    backgroundColor: '#eeeeee',
    borderRadius: 18,
    padding: 16,
    marginTop: 13,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 13,
  },

  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 5,
  },

  passcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  passcodeInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 13,
    paddingHorizontal: 13,
    fontSize: 11,
  },

  resetText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 10,
  },

  updatedText: {
    fontSize: 9,
    color: '#888',
    marginTop: 4,
    marginBottom: 10,
  },

  credentialRow: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  credentialIcon: {
    width: 37,
    height: 37,
    borderRadius: 19,
    backgroundColor: '#eeeeee',
    justifyContent: 'center',
    alignItems: 'center',
  },

  credentialInfo: {
    flex: 1,
    marginLeft: 10,
  },

  credentialTitle: {
    fontSize: 11,
    fontWeight: '800',
  },

  credentialSubtext: {
    fontSize: 9,
    color: '#777',
    marginTop: 2,
  },

  manageButton: {
    backgroundColor: '#eeeeee',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },

  manageText: {
    fontSize: 9,
    fontWeight: '700',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  viewAll: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
  },

  activityRow: {
    backgroundColor: '#fff',
    borderRadius: 13,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  activityInfo: {
    flex: 1,
    marginLeft: 10,
  },

  activityTitle: {
    fontSize: 10,
    fontWeight: '700',
  },

  activitySubtext: {
    fontSize: 9,
    color: '#777',
    marginTop: 2,
  },

  activityTime: {
    fontSize: 9,
    color: '#888',
  },
});