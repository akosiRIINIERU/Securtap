import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function GuestsScreen() {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadGuests = async () => {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .order('check_in', { ascending: true });

    if (error) {
      console.log(error);
      return;
    }

    setGuests(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadGuests();

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.brandTitle}>SECURTAP</Text>
        <Text style={styles.welcomeSub}>Guests</Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#000"
            style={{ marginTop: 30 }}
          />
        ) : guests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="people-outline"
              size={42}
              color="#777"
            />

            <Text style={styles.emptyTitle}>
              No Guests
            </Text>

            <Text style={styles.emptyText}>
              No guest records have been added yet.
            </Text>
          </View>
        ) : (
          guests.map(guest => (
            <View
              key={guest.guest_id}
              style={styles.mainCard}
            >
              <View style={styles.cardHeaderRow}>
                <View style={styles.avatar}>
                  <Ionicons
                    name="person-outline"
                    size={22}
                    color="#111"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.guestName}>
                    {guest.full_name}
                  </Text>

                  <Text style={styles.bookingReference}>
                    {guest.booking_reference ||
                      'No booking reference'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsGroup}>
                <Text style={styles.detailText}>
                  Phone: {guest.phone || 'Not provided'}
                </Text>

                <Text style={styles.detailText}>
                  Email: {guest.email || 'Not provided'}
                </Text>

                <Text style={styles.detailText}>
                  Payment Status:{' '}
                  {guest.payment_status || 'Pending'}
                </Text>

                <Text style={styles.detailText}>
                  Check-in:{' '}
                  {guest.check_in
                    ? new Date(
                        guest.check_in
                      ).toLocaleDateString()
                    : 'N/A'}
                </Text>

                <Text style={styles.detailText}>
                  Check-out:{' '}
                  {guest.check_out
                    ? new Date(
                        guest.check_out
                      ).toLocaleDateString()
                    : 'N/A'}
                </Text>

                <Text style={styles.detailText}>
                  Status: {guest.status || 'Active'}
                </Text>
              </View>

              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>
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

  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  avatar: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  guestName: {
    fontSize: 15,
    fontWeight: '800',
  },

  bookingReference: {
    fontSize: 10,
    color: '#777',
    marginTop: 3,
  },

  detailsGroup: {
    marginLeft: 5,
  },

  detailText: {
    fontSize: 11,
    color: '#333',
    marginVertical: 3,
  },

  actionButton: {
    backgroundColor: '#fff',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 15,
    alignSelf: 'flex-end',
    marginTop: 15,
  },

  actionButtonText: {
    fontSize: 11,
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