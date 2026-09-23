import React, { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  supabase,
  getSupabaseErrorMessage,
} from '../lib/supabase';

export default function DashboardScreen() {
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [locks, setLocks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [guests, setGuests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = useCallback(async () => {
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
          .select('*'),

        supabase
          .from('property_units')
          .select('*'),

        supabase
          .from('smart_locks')
          .select('*'),

        supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', {
            ascending: false,
          })
          .limit(5),

        supabase
          .from('guests')
          .select('*'),
      ]);

      if (propertiesResult.error) {
        throw propertiesResult.error;
      }

      if (unitsResult.error) {
        throw unitsResult.error;
      }

      if (locksResult.error) {
        throw locksResult.error;
      }

      if (activitiesResult.error) {
        throw activitiesResult.error;
      }

      if (guestsResult.error) {
        throw guestsResult.error;
      }

      setProperties(propertiesResult.data || []);
      setUnits(unitsResult.data || []);
      setLocks(locksResult.data || []);
      setActivities(activitiesResult.data || []);
      setGuests(guestsResult.data || []);

    } catch (error) {
      console.error('Dashboard loading error:', error);

      Alert.alert(
        'Dashboard Error',
        getSupabaseErrorMessage(error)
      );
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);

      try {
        await loadDashboardData();
      } finally {
        setLoading(false);
      }
    };

    initialize();

    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'properties',
        },
        loadDashboardData
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'property_units',
        },
        loadDashboardData
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'smart_locks',
        },
        loadDashboardData
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_logs',
        },
        loadDashboardData
      )
      .subscribe((status, error) => {
        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT'
        ) {
          console.error(
            'Dashboard realtime error:',
            error
          );
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDashboardData]);

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await loadDashboardData();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#111" />
        <Text style={styles.loadingText}>
          Loading dashboard...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >

        <View style={styles.header}>
          <View>
            <Text style={styles.brandTitle}>
              SECURTAP
            </Text>

            <Text style={styles.welcomeSub}>
              Welcome, Admin!
            </Text>
          </View>

          <TouchableOpacity
            style={styles.notificationButton}
          >
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
                  (lock) =>
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

            <TouchableOpacity>
              <Text style={styles.viewAll}>
                View All
              </Text>
            </TouchableOpacity>
          </View>

          {activities.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No recent activities.
              </Text>
            </View>
          ) : (
            activities.map((activity) => (
              <View
                key={activity.id}
                style={styles.activityCard}
              >
                <View style={styles.activityIcon}>
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color="#111"
                  />
                </View>

                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>
                    {activity.action ||
                      'Activity'}
                  </Text>

                  <Text
                    style={
                      styles.activityDescription
                    }
                  >
                    {activity.description ||
                      'Recent system activity'}
                  </Text>
                </View>
              </View>
            ))
          )}

        </View>

        <View style={styles.section}>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Upcoming Check-ins
            </Text>

            <TouchableOpacity>
              <Text style={styles.viewAll}>
                View All
              </Text>
            </TouchableOpacity>
          </View>

          {guests.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No upcoming guests.
              </Text>
            </View>
          ) : (
            guests.slice(0, 5).map((guest) => (
              <View
                key={guest.id}
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
                    {guest.name || 'Guest'}
                  </Text>

                  <Text style={styles.guestProperty}>
                    {guest.property_id ||
                      'Property'}
                  </Text>

                  <Text style={styles.guestDate}>
                    Check-in:{' '}
                    {guest.check_in || 'Not set'}
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

  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  brandTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: '#111',
  },

  welcomeSub: {
    fontSize: 14,
    color: '#777',
    marginTop: 3,
  },

  notificationButton: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: '#f3f3f3',
    justifyContent: 'center',
    alignItems: 'center',
  },

  notificationDot: {
    position: 'absolute',
    right: 10,
    top: 9,
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: '#111',
  },

  dateText: {
    color: '#777',
    marginTop: 15,
  },

  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },

  metricCard: {
    flex: 1,
    backgroundColor: '#f4f4f4',
    borderRadius: 18,
    padding: 15,
  },

  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  metricNumber: {
    fontSize: 25,
    fontWeight: '800',
    color: '#111',
    marginTop: 12,
  },

  metricLabel: {
    fontSize: 12,
    color: '#777',
    marginTop: 3,
  },

  section: {
    marginTop: 28,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111',
  },

  viewAll: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },

  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },

  activityIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  activityInfo: {
    flex: 1,
    marginLeft: 12,
  },

  activityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },

  activityDescription: {
    fontSize: 12,
    color: '#777',
    marginTop: 3,
  },

  checkInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },

  guestAvatar: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  guestInfo: {
    flex: 1,
    marginLeft: 12,
  },

  guestName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },

  guestProperty: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
    color: '#555',
  },

  guestDate: {
    fontSize: 12,
    color: '#777',
    marginTop: 3,
  },

  emptyCard: {
    backgroundColor: '#f4f4f4',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },

  emptyText: {
    color: '#777',
  },
});