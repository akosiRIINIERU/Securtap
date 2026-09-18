
import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity } from 'react-native';

export default function PropertiesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.brandTitle}>SECURTAP</Text>
        <Text style={styles.welcomeSub}>Welcome, Admin!</Text>

        <View style={styles.mainCard}>
          <Text style={styles.cardHeader}>Properties</Text>
          <Text style={styles.propertyName}>AIRBNB 1</Text>
          <View style={styles.detailsGroup}>
            <Text style={styles.detailText}>Guest: Kyle sksksks</Text>
            <Text style={styles.detailText}>Check-in: June xx, xxxx</Text>
            <Text style={styles.detailText}>Check-out: June xx, xxxx</Text>
          </View>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>+ Add Property</Text>
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
  cardHeader: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  propertyName: { fontSize: 14, fontWeight: 'bold', marginBottom: 5 },
  detailsGroup: { marginLeft: 10 },
  detailText: { fontSize: 12, color: '#333', marginVertical: 2 },
  actionButton: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 15, alignSelf: 'flex-end', marginTop: 'auto' },
  actionButtonText: { fontSize: 12, fontWeight: '600' },
});
