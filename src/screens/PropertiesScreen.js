import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { supabase, getSupabaseErrorMessage } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

export default function PropertiesScreen({ navigation }) {
  const { colors } = useTheme();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  const loadProperties = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setProperties([]);
        return;
      }

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('admin_id', user.id)
        .order('created_at', {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setProperties(data || []);
    } catch (error) {
      console.error('Load properties error:', error);

      Alert.alert(
        'Unable to Load Properties',
        getSupabaseErrorMessage(error)
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProperties();

    // IMPORTANT:
    // .on() MUST come before .subscribe()
    const channel = supabase
      .channel('properties-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'properties',
        },
        () => {
          loadProperties();
        }
      )
      .subscribe((status, error) => {
        console.log(
          'Properties realtime status:',
          status
        );

        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT'
        ) {
          console.error(
            'Properties realtime error:',
            error
          );
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadProperties]);

  const handleAddProperty = async () => {
    const cleanName = name.trim();
    const cleanAddress = address.trim();

    if (!cleanName) {
      Alert.alert(
        'Missing Property Name',
        'Please enter a property name.'
      );
      return;
    }

    try {
      setAdding(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert(
          'Session Expired',
          'Please log in again.'
        );
        return;
      }

      const { error } = await supabase
        .from('properties')
        .insert({
          name: cleanName,
          address: cleanAddress || null,
          admin_id: user.id,
        });

      if (error) {
        throw error;
      }

      setName('');
      setAddress('');
      setShowAddForm(false);

      await loadProperties();

      Alert.alert(
        'Property Added',
        `${cleanName} has been added successfully.`
      );
    } catch (error) {
      console.error('Add property error:', error);

      Alert.alert(
        'Unable to Add Property',
        getSupabaseErrorMessage(error)
      );
    } finally {
      setAdding(false);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={[
            styles.brandTitle,
            { color: colors.text },
          ]}
        >
          SECURTAP
        </Text>

        <Text
          style={[
            styles.welcomeSub,
            { color: colors.secondaryText },
          ]}
        >
          Your Properties
        </Text>

        {showAddForm && (
          <View
            style={[
              styles.formCard,
              { backgroundColor: colors.card },
            ]}
          >
            <View style={styles.formHeader}>
              <Text
                style={[
                  styles.cardHeader,
                  { color: colors.text },
                ]}
              >
                Add Property
              </Text>

              <TouchableOpacity
                onPress={() => setShowAddForm(false)}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            <Text
              style={[
                styles.label,
                { color: colors.text },
              ]}
            >
              Property Name
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.input,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="e.g. Airbnb 1"
              placeholderTextColor={colors.secondaryText}
              value={name}
              onChangeText={setName}
            />

            <Text
              style={[
                styles.label,
                { color: colors.text },
              ]}
            >
              Address
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.input,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Property address"
              placeholderTextColor={colors.secondaryText}
              value={address}
              onChangeText={setAddress}
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleAddProperty}
              disabled={adding}
            >
              {adding ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Add Property
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {!showAddForm && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddForm(true)}
          >
            <Ionicons
              name="add"
              size={20}
              color="#fff"
            />

            <Text style={styles.addButtonText}>
              Add Property
            </Text>
          </TouchableOpacity>
        )}

        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.text}
            style={styles.loader}
          />
        ) : properties.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.card },
            ]}
          >
            <Ionicons
              name="business-outline"
              size={42}
              color={colors.secondaryText}
            />

            <Text
              style={[
                styles.emptyTitle,
                { color: colors.text },
              ]}
            >
              No Properties
            </Text>

            <Text
              style={[
                styles.emptyText,
                { color: colors.secondaryText },
              ]}
            >
              Add your first property to start
              managing smart locks.
            </Text>
          </View>
        ) : (
          properties.map((property) => (
            <TouchableOpacity
              key={property.id}
              style={[
                styles.propertyCard,
                { backgroundColor: colors.card },
              ]}
              onPress={() => {
                Alert.alert(
                  property.name,
                  property.address ||
                    'No address provided.'
                );
              }}
            >
              <View style={styles.propertyIcon}>
                <Ionicons
                  name="business-outline"
                  size={24}
                  color="#111"
                />
              </View>

              <View style={styles.propertyInfo}>
                <Text
                  style={[
                    styles.propertyName,
                    { color: colors.text },
                  ]}
                >
                  {property.name}
                </Text>

                <Text
                  style={[
                    styles.propertyAddress,
                    { color: colors.secondaryText },
                  ]}
                >
                  {property.address ||
                    'No address provided'}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.secondaryText}
              />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    padding: 20,
    paddingBottom: 100,
  },

  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
  },

  welcomeSub: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 18,
  },

  addButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#111',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 7,
  },

  formCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },

  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  cardHeader: {
    fontSize: 18,
    fontWeight: '800',
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 7,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },

  primaryButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },

  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },

  propertyCard: {
    minHeight: 78,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  propertyIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#e8e8e8',
    justifyContent: 'center',
    alignItems: 'center',
  },

  propertyInfo: {
    flex: 1,
    marginLeft: 12,
  },

  propertyName: {
    fontSize: 15,
    fontWeight: '800',
  },

  propertyAddress: {
    fontSize: 12,
    marginTop: 4,
  },

  emptyCard: {
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
  },

  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },

  loader: {
    marginTop: 40,
  },
});