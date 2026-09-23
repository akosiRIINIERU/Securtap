import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [locks, setLocks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      const [
        propertiesResult,
        unitsResult,
        locksResult,
        activitiesResult,
        guestsResult,
      ] = await Promise.all([
        supabase
          .from('properties')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('property_units')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('smart_locks')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5),

        supabase
          .from('guests')
          .select('*')
          .order('check_in', { ascending: true })
          .limit(5),
      ]);

      if (propertiesResult.data) {
        setProperties(propertiesResult.data);
      }

      if (unitsResult.data) {
        setUnits(unitsResult.data);
      }

      if (locksResult.data) {
        setLocks(locksResult.data);
      }

      if (activitiesResult.data) {
        setActivities(activitiesResult.data);
      }

      if (guestsResult.data) {
        setGuests(guestsResult.data);
      }
    } catch (error) {
      console.log('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();

    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'properties',
        },
        loadDashboard
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'property_units',
        },
        loadDashboard
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'smart_locks',
        },
        loadDashboard
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_logs',
        },
        loadDashboard
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatActivity = (activity) => {
    return activity.description ||
      activity.event_type ||
      'System activity';
  };

  const formatTime = (date) => {
    if (!date) return '';

    const diff =
      Math.floor(
        (Date.now() - new Date(date).getTime()) / 60000
      );

    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;

    const hours = Math.floor(diff / 60);

    if (hours < 24) return `${hours}h ago`;

    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
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

        <Text style={styles.dateText}>
          {new Date().toLocaleDateString()}
        </Text>

        {loading ? (
          <ActivityIndicator
            size="small"
            color="#111"
            style={{ marginTop: 20 }}
          />
        ) : (
          <>
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="business-outline"
                    size={21}
                    color="#111"
                  />
                </View>

                <Text style={styles.metricNumber}>
                  {properties.length}
                </Text>

                <Text style={styles.metricLabel}>
                  Properties
                </Text>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="home-outline"
                    size={21}
                    color="#111"
                  />
                </View>

                <Text style={styles.metricNumber}>
                  {units.length}
                </Text>

                <Text style={styles.metricLabel}>
                  Active Units
                </Text>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={21}
                    color="#111"
                  />
                </View>

                <Text style={styles.metricNumber}>
                  {
                    locks.filter(
                      lock =>
                        lock.status === 'locked'
                    ).length
                  }
                </Text>

                <Text style={styles.metricLabel}>
                  Locked
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Recent Activities
                </Text>
              </View>

              {activities.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    No recent activities.
                  </Text>
                </View>
              ) : (
                activities.map(activity => (
                  <View
                    key={activity.log_id}
                    style={styles.activityCard}
                  >
                    <View style={styles.activityIcon}>
                      <Ionicons
                        name="pulse-outline"
                        size={20}
                        color="#111"
                      />
                    </View>

                    <View style={styles.activityInfo}>
                      <Text style={styles.activityTitle}>
                        {activity.event_type || 'Activity'}
                      </Text>

                      <Text style={styles.activityDescription}>
                        {formatActivity(activity)}
                      </Text>
                    </View>

                    <Text style={styles.activityTime}>
                      {formatTime(activity.created_at)}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Upcoming Check-ins
                </Text>
              </View>

              {guests.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    No upcoming guests.
                  </Text>
                </View>
              ) : (
                guests.map(guest => (
                  <View
                    key={guest.guest_id}
                    style={styles.checkInCard}
                  >
                    <View style={styles.guestAvatar}>
                      <Ionicons
                        name="person-outline"
                        size={22}
                        color="#111"
                      />
                    </View>

                    <View style={styles.guestInfo}>
                      <Text style={styles.guestName}>
                        {guest.full_name}
                      </Text>

                      <Text style={styles.guestProperty}>
                        {guest.booking_reference || 'Guest'}
                      </Text>

                      <Text style={styles.guestDate}>
                        Check-in:{' '}
                        {guest.check_in
                          ? new Date(
                              guest.check_in
                            ).toLocaleDateString()
                          : 'N/A'}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#777"
                    />
                  </View>
                ))
              )}
            </View>
          </>
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
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111',
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

  emptyCard: {
    backgroundColor: '#eeeeee',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },

  emptyText: {
    color: '#777',
    fontSize: 12,
  },
});