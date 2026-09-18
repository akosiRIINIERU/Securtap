import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandTitle}>SECURTAP</Text>
            <Text style={styles.welcomeSub}>Welcome, Admin!</Text>
          </View>
          <View style={styles.headerRight}>
            <Ionicons name="notifications-outline" size={24} color="black" />
            <Text style={styles.dateText}>June xx, xxxx</Text>
          </View>
        </View>

        {/* Metric Cards */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <View style={styles.metricBox} />
            <Text style={styles.metricLabel}>Properties</Text>
          </View>
          <View style={styles.metricItem}>
            <View style={styles.metricBox} />
            <Text style={styles.metricLabel}>Active Units</Text>
          </View>
          <View style={styles.metricItem}>
            <View style={styles.metricBox} />
            <Text style={styles.metricLabel}>Units Locked</Text>
          </View>
        </View>

        {/* Recent Activities Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activities</Text>
            <TouchableOpacity><Text style={styles.viewAll}>View All</Text></TouchableOpacity>
          </View>
          <View style={styles.placeholderBox} />
        </View>

        {/* Upcoming Check-ins Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Check-ins</Text>
            <TouchableOpacity><Text style={styles.viewAll}>View All</Text></TouchableOpacity>
          </View>
          <View style={styles.placeholderBox} />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 20, paddingBottom: 90 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  brandTitle: { fontSize: 20, fontWeight: 'bold' },
  welcomeSub: { fontSize: 14, color: '#444' },
  headerRight: { alignItems: 'flex-end' },
  dateText: { fontSize: 12, color: '#666', marginTop: 4 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  metricItem: { alignItems: 'center', width: '30%' },
  metricBox: { width: 70, height: 70, backgroundColor: '#d9d9d9', borderRadius: 8, marginBottom: 6 },
  metricLabel: { fontSize: 11, fontWeight: '500', color: '#333' },
  sectionCard: { backgroundColor: '#d9d9d9', borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontWeight: 'bold', fontSize: 14 },
  viewAll: { fontSize: 12, fontStyle: 'italic', color: '#444' },
  placeholderBox: { height: 100 },
});