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
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  supabase,
  getSupabaseErrorMessage,
} from '../lib/supabase';

export default function GuestsScreen() {
  const [guests, setGuests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGuests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .order('created_at', {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setGuests(data || []);
    } catch (error) {
      console.error(
        'Guests loading error:',
        error
      );

      Alert.alert(
        'Guests Error',
        getSupabaseErrorMessage(error)
      );
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);

      try {
        await loadGuests();
      } finally {
        setLoading(false);
      }
    };

    initialize();

    const channel = supabase
      .channel('guests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guests',
        },
        loadGuests
      )
      .subscribe((status, error) => {
        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT'
        ) {
          console.error(
            'Guests realtime error:',
            error
          );
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadGuests]);

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await loadGuests();
    } finally {
      setRefreshing(false);
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
          Loading guests...
        </Text>
      </SafeAreaView>
    );
  }

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
          Guests
        </Text>

        {guests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="people-outline"
              size={45}
              color="#777"
            />

            <Text style={styles.emptyTitle}>
              No Guests
            </Text>

            <Text style={styles.emptyText}>
              There are currently no guests registered.
            </Text>
          </View>
        ) : (
          guests.map((guest) => (
            <View
              key={guest.id}
              style={styles.mainCard}
            >

              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Ionicons
                    name="person-outline"
                    size={23}
                    color="#111"
                  />
                </View>

                <View style={styles.headerInfo}>
                  <Text style={styles.guestName}>
                    {guest.name || 'Guest'}
                  </Text>

                  <Text style={styles.status}>
                    {guest.status || 'ACTIVE'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsGroup}>

                <Text style={styles.detailText}>
                  Room:{' '}
                  {guest.unit_id ||
                    guest.property_id ||
                    'Not assigned'}
                </Text>

                <Text style={styles.detailText}>
                  Payment Status:{' '}
                  {guest.payment_status ||
                    'Not specified'}
                </Text>

                <Text style={styles.detailText}>
                  Phone:{' '}
                  {guest.phone ||
                    'Not provided'}
                </Text>

                <Text style={styles.detailText}>
                  Email:{' '}
                  {guest.email ||
                    'Not provided'}
                </Text>

                <Text style={styles.detailText}>
                  Check-in:{' '}
                  {guest.check_in ||
                    'Not specified'}
                </Text>

                <Text style={styles.detailText}>
                  Check-out:{' '}
                  {guest.check_out ||
                    'Not specified'}
                </Text>

                <Text style={styles.detailText}>
                  Booking Reference:{' '}
                  {guest.booking_reference ||
                    'Not provided'}
                </Text>

              </View>

              <TouchableOpacity
                style={styles.actionButton}
              >
                <Text
                  style={styles.actionButtonText}
                >
                  View Guest
                </Text>
              </TouchableOpacity>

            </View>
          ))
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
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },

  guestName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111',
  },

  status: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
    marginTop: 4,
  },

  detailsGroup: {
    marginTop: 18,
  },

  detailText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 8,
  },

  actionButton: {
    height: 48,
    backgroundColor: '#111',
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },

  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
  },

  emptyCard: {
    backgroundColor: '#f4f4f4',
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },

  emptyText: {
    color: '#777',
    textAlign: 'center',
    marginTop: 5,
  },
});