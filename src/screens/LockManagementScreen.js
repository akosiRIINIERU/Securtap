import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TextInput, TouchableOpacity } from 'react-native';

export default function LockManagementScreen() {
  const [passcode, setPasscode] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.brandTitle}>SECURTAP</Text>
        <Text style={styles.welcomeSub}>Welcome, Admin!</Text>

        <View style={styles.mainCard}>
          <Text style={styles.cardHeader}>LOCK MANAGEMENT</Text>
          
          <Text style={styles.subText}>Lock Name: AIRBNB 1 Smart Lock</Text>
          <Text style={styles.subText}>Status:</Text>

          <Text style={styles.sectionTitle}>Access Credentials</Text>
          <Text style={styles.fieldLabel}>Passcode</Text>
          
          <View style={styles.passcodeRow}>
            <TextInput style={styles.passcodeInput} value={passcode} onChangeText={setPasscode} />
            <TouchableOpacity><Text style={styles.resetText}>Reset</Text></TouchableOpacity>
          </View>
          <Text style={styles.updatedText}>Last Updated: June xx, xxxx</Text>

          {/* NFC Section */}
          <Text style={styles.fieldLabel}>NFC</Text>
          <View style={styles.manageRow}>
            <Text style={styles.registeredText}>Registered Cards: 2</Text>
            <TouchableOpacity style={styles.smallButton}>
              <Text style={styles.smallButtonText}>Manage NFC Cards</Text>
            </TouchableOpacity>
          </View>

          {/* Fingerprint Section */}
          <Text style={styles.fieldLabel}>Fingerprint</Text>
          <View style={styles.manageRow}>
            <Text style={styles.registeredText}>Registered Fingerprints: 2</Text>
            <TouchableOpacity style={styles.smallButton}>
              <Text style={styles.smallButtonText}>Manage Fingerprints</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  content: { flex: 1 },
  brandTitle: { fontSize: 20, fontWeight: 'bold' },
  welcomeSub: { fontSize: 14, color: '#444', marginBottom: 20 },
  mainCard: { flex: 1, backgroundColor: '#d9d9d9', borderRadius: 20, padding: 20, marginBottom: 80 },
  cardHeader: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  subText: { fontSize: 12, color: '#333', marginBottom: 4 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginTop: 15, marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontWeight: 'bold', marginTop: 8 },
  passcodeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  passcodeInput: { flex: 1, height: 35, backgroundColor: '#fff', borderRadius: 15, paddingHorizontal: 10 },
  resetText: { fontSize: 11, marginLeft: 10, color: '#333' },
  updatedText: { fontSize: 10, color: '#666', marginTop: 2, marginBottom: 10 },
  manageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  registeredText: { fontSize: 11, color: '#333' },
  smallButton: { backgroundColor: '#fff', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  smallButtonText: { fontSize: 10, fontWeight: '500' },
  saveButton: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 30, borderRadius: 15, alignSelf: 'flex-end', marginTop: 'auto' },
  saveButtonText: { fontSize: 12, fontWeight: 'bold' },
});