import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function GuestsScreen() {
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
            <Text style={styles.welcomeSub}>Guest Management</Text>
          </View>

          <TouchableOpacity style={styles.addIcon}>
            <Ionicons name="person-add-outline" size={21} color="#111" />
          </TouchableOpacity>
        </View>

        {/* TITLE */}
        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>Guests</Text>

          <Text style={styles.guestCount}>12 Guests</Text>
        </View>

        {/* GUEST CARD */}
        <View style={styles.guestCard}>
          <View style={styles.avatar}>
            <Ionicons
              name="person-outline"
              size={25}
              color="#111"
            />
          </View>

          <View style={styles.guestInfo}>
            <Text style={styles.guestName}>KYLE SKSKSKS</Text>

            <Text style={styles.propertyText}>
              AIRBNB 1
            </Text>

            <Text style={styles.detailText}>
              Check-in: June xx, xxxx
            </Text>

            <Text style={styles.detailText}>
              Check-out: June xx, xxxx
            </Text>
          </View>

          <View style={styles.paidBadge}>
            <Text style={styles.paidText}>PAID</Text>
          </View>
        </View>

        {/* DETAILS */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Guest Details</Text>

          <View style={styles.detailRow}>
            <Ionicons
              name="call-outline"
              size={17}
              color="#555"
            />

            <Text style={styles.detailValue}>
              Phone number
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons
              name="mail-outline"
              size={17}
              color="#555"
            />

            <Text style={styles.detailValue}>
              Email Address
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons
              name="document-text-outline"
              size={17}
              color="#555"
            />

            <Text style={styles.detailValue}>
              Booking Reference
            </Text>
          </View>
        </View>

        {/* ACTION */}
        <TouchableOpacity style={styles.bookButton}>
          <Ionicons name="add" size={20} color="#111" />

          <Text style={styles.bookButtonText}>
            Book New Guest
          </Text>
        </TouchableOpacity>
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

  addIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#eeeeee',
    justifyContent: 'center',
    alignItems: 'center',
  },

  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 13,
  },

  pageTitle: {
    fontSize: 18,
    fontWeight: '800',
  },

  guestCount: {
    fontSize: 11,
    color: '#777',
  },

  guestCard: {
    backgroundColor: '#eeeeee',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  guestInfo: {
    flex: 1,
  },

  guestName: {
    fontSize: 13,
    fontWeight: '800',
  },

  propertyText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#555',
    marginTop: 3,
  },

  detailText: {
    fontSize: 9,
    color: '#777',
    marginTop: 3,
  },

  paidBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },

  paidText: {
    fontSize: 9,
    fontWeight: '800',
  },

  detailsCard: {
    backgroundColor: '#eeeeee',
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
  },

  detailsTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 14,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#d4d4d4',
  },

  detailValue: {
    fontSize: 11,
    color: '#555',
    marginLeft: 10,
  },

  bookButton: {
    height: 50,
    backgroundColor: '#eeeeee',
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },

  bookButtonText: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 5,
  },
});