import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandTitle}>SECURTAP</Text>
            <Text style={styles.welcomeSub}>Welcome, Admin!</Text>
          </View>

          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons
              name="notifications-outline"
              size={24}
              color="#111"
            />

            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        <Text style={styles.dateText}>June xx, xxxx</Text>

        {/* SUMMARY CARDS */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <View style={styles.iconCircle}>
              <Ionicons
                name="business-outline"
                size={21}
                color="#111"
              />
            </View>

            <Text style={styles.metricNumber}>3</Text>
            <Text style={styles.metricLabel}>Properties</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.iconCircle}>
              <Ionicons
                name="home-outline"
                size={21}
                color="#111"
              />
            </View>

            <Text style={styles.metricNumber}>8</Text>
            <Text style={styles.metricLabel}>Active Units</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.iconCircle}>
              <Ionicons
                name="lock-closed-outline"
                size={21}
                color="#111"
              />
            </View>

            <Text style={styles.metricNumber}>2</Text>
            <Text style={styles.metricLabel}>Locked</Text>
          </View>
        </View>

        {/* RECENT ACTIVITIES */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activities</Text>

            <TouchableOpacity>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activityCard}>
            <View style={styles.activityIcon}>
              <Ionicons
                name="lock-open-outline"
                size={20}
                color="#111"
              />
            </View>

            <View style={styles.activityInfo}>
              <Text style={styles.activityTitle}>
                Airbnb 1 unlocked
              </Text>

              <Text style={styles.activityDescription}>
                Fingerprint authentication
              </Text>
            </View>

            <Text style={styles.activityTime}>2m ago</Text>
          </View>

          <View style={styles.activityCard}>
            <View style={styles.activityIcon}>
              <Ionicons
                name="card-outline"
                size={20}
                color="#111"
              />
            </View>

            <View style={styles.activityInfo}>
              <Text style={styles.activityTitle}>
                NFC card used
              </Text>

              <Text style={styles.activityDescription}>
                Airbnb 2 Smart Lock
              </Text>
            </View>

            <Text style={styles.activityTime}>15m ago</Text>
          </View>

          <View style={styles.activityCard}>
            <View style={styles.activityIcon}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#111"
              />
            </View>

            <View style={styles.activityInfo}>
              <Text style={styles.activityTitle}>
                Airbnb 3 locked
              </Text>

              <Text style={styles.activityDescription}>
                Automatic lock
              </Text>
            </View>

            <Text style={styles.activityTime}>32m ago</Text>
          </View>
        </View>

        {/* UPCOMING CHECK-INS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Upcoming Check-ins
            </Text>

            <TouchableOpacity>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.checkInCard}>
            <View style={styles.guestAvatar}>
              <Ionicons
                name="person-outline"
                size={22}
                color="#111"
              />
            </View>

            <View style={styles.guestInfo}>
              <Text style={styles.guestName}>Kyle Sksksks</Text>
              <Text style={styles.guestProperty}>AIRBNB 1</Text>
              <Text style={styles.guestDate}>
                Check-in: June xx, xxxx
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#777"
            />
          </View>

          <View style={styles.checkInCard}>
            <View style={styles.guestAvatar}>
              <Ionicons
                name="person-outline"
                size={22}
                color="#111"
              />
            </View>

            <View style={styles.guestInfo}>
              <Text style={styles.guestName}>Guest Name</Text>
              <Text style={styles.guestProperty}>AIRBNB 2</Text>
              <Text style={styles.guestDate}>
                Check-in: June xx, xxxx
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#777"
            />
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

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 100,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  brandTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#111',
    letterSpacing: 0.5,
  },

  welcomeSub: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },

  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },

  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#111',
  },

  dateText: {
    fontSize: 11,
    color: '#888',
    alignSelf: 'flex-end',
    marginTop: -4,
  },

  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 25,
  },

  metricCard: {
    width: (width - 54) / 3,
    minHeight: 125,
    backgroundColor: '#eeeeee',
    borderRadius: 18,
    padding: 13,
  },

  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },

  metricNumber: {
    fontSize: 23,
    fontWeight: '800',
    color: '#111',
  },

  metricLabel: {
    fontSize: 11,
    color: '#555',
    marginTop: 1,
  },

  section: {
    marginBottom: 23,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111',
  },

  viewAll: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },

  activityCard: {
    minHeight: 70,
    backgroundColor: '#eeeeee',
    borderRadius: 15,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },

  activityInfo: {
    flex: 1,
  },

  activityTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111',
  },

  activityDescription: {
    fontSize: 10,
    color: '#777',
    marginTop: 3,
  },

  activityTime: {
    fontSize: 9,
    color: '#888',
  },

  checkInCard: {
    minHeight: 78,
    backgroundColor: '#eeeeee',
    borderRadius: 15,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  guestAvatar: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  guestInfo: {
    flex: 1,
  },

  guestName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111',
  },

  guestProperty: {
    fontSize: 10,
    fontWeight: '600',
    color: '#555',
    marginTop: 2,
  },

  guestDate: {
    fontSize: 9,
    color: '#777',
    marginTop: 3,
  },
});