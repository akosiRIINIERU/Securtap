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

export default function PropertiesScreen() {
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
            <Text style={styles.welcomeSub}>Your Properties</Text>
          </View>

          <TouchableOpacity style={styles.addIcon}>
            <Ionicons name="add" size={23} color="#111" />
          </TouchableOpacity>
        </View>

        {/* PAGE TITLE */}
        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>Properties</Text>

          <Text style={styles.propertyCount}>3 Properties</Text>
        </View>

        {/* PROPERTY CARD */}
        <TouchableOpacity style={styles.propertyCard}>
          <View style={styles.propertyImage}>
            <Ionicons
              name="business-outline"
              size={35}
              color="#777"
            />
          </View>

          <View style={styles.propertyInfo}>
            <Text style={styles.propertyName}>AIRBNB 1</Text>

            <Text style={styles.propertyAddress}>
              Property Address
            </Text>

            <View style={styles.statusRow}>
              <View style={styles.statusDot} />

              <Text style={styles.statusText}>Active</Text>
            </View>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color="#777"
          />
        </TouchableOpacity>

        {/* PROPERTY CARD */}
        <TouchableOpacity style={styles.propertyCard}>
          <View style={styles.propertyImage}>
            <Ionicons
              name="business-outline"
              size={35}
              color="#777"
            />
          </View>

          <View style={styles.propertyInfo}>
            <Text style={styles.propertyName}>AIRBNB 2</Text>

            <Text style={styles.propertyAddress}>
              Property Address
            </Text>

            <View style={styles.statusRow}>
              <View style={styles.statusDot} />

              <Text style={styles.statusText}>Active</Text>
            </View>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color="#777"
          />
        </TouchableOpacity>

        {/* PROPERTY CARD */}
        <TouchableOpacity style={styles.propertyCard}>
          <View style={styles.propertyImage}>
            <Ionicons
              name="business-outline"
              size={35}
              color="#777"
            />
          </View>

          <View style={styles.propertyInfo}>
            <Text style={styles.propertyName}>AIRBNB 3</Text>

            <Text style={styles.propertyAddress}>
              Property Address
            </Text>

            <View style={styles.statusRow}>
              <View style={styles.statusDot} />

              <Text style={styles.statusText}>Active</Text>
            </View>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color="#777"
          />
        </TouchableOpacity>

        {/* ADD PROPERTY */}
        <TouchableOpacity style={styles.addPropertyButton}>
          <Ionicons name="add" size={20} color="#111" />

          <Text style={styles.addPropertyText}>
            Add Property
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

  propertyCount: {
    fontSize: 11,
    color: '#777',
  },

  propertyCard: {
    backgroundColor: '#eeeeee',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  propertyImage: {
    width: 68,
    height: 68,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  propertyInfo: {
    flex: 1,
  },

  propertyName: {
    fontSize: 13,
    fontWeight: '800',
  },

  propertyAddress: {
    fontSize: 10,
    color: '#777',
    marginTop: 4,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#555',
    marginRight: 5,
  },

  statusText: {
    fontSize: 9,
    color: '#555',
  },

  addPropertyButton: {
    height: 48,
    backgroundColor: '#eeeeee',
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },

  addPropertyText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
});