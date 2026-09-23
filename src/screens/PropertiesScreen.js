import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function PropertiesScreen() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  const loadProperties = async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.log(error);
      return;
    }

    setProperties(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadProperties();

    const channel = supabase
      .channel('properties-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'properties',
        },
        loadProperties
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addProperty = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a property name.');
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('properties')
      .insert({
        name: name.trim(),
        address: address.trim(),
        admin_id: user?.id,
      });

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setName('');
    setAddress('');
    setModalVisible(false);
    loadProperties();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.brandTitle}>SECURTAP</Text>
        <Text style={styles.welcomeSub}>Properties</Text>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>
            Add Property
          </Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#000"
            style={{ marginTop: 30 }}
          />
        ) : properties.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="business-outline"
              size={40}
              color="#777"
            />

            <Text style={styles.emptyTitle}>
              No Properties
            </Text>

            <Text style={styles.emptyText}>
              Add your first property to SECURTAP.
            </Text>
          </View>
        ) : (
          properties.map(property => (
            <View
              key={property.property_id}
              style={styles.propertyCard}
            >
              <View style={styles.propertyIcon}>
                <Ionicons
                  name="business-outline"
                  size={24}
                  color="#111"
                />
              </View>

              <View style={styles.propertyInfo}>
                <Text style={styles.propertyName}>
                  {property.name}
                </Text>

                <Text style={styles.detailText}>
                  {property.address || 'No address'}
                </Text>

                <Text style={styles.status}>
                  {property.status || 'Active'}
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
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              Add Property
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Property name"
              value={name}
              onChangeText={setName}
            />

            <TextInput
              style={styles.input}
              placeholder="Address"
              value={address}
              onChangeText={setAddress}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={addProperty}
              >
                <Text style={styles.saveButtonText}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  addButton: {
    backgroundColor: '#111',
    borderRadius: 16,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 6,
  },

  propertyCard: {
    backgroundColor: '#eeeeee',
    borderRadius: 18,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  propertyIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  propertyInfo: {
    flex: 1,
  },

  propertyName: {
    fontSize: 15,
    fontWeight: '700',
  },

  detailText: {
    fontSize: 11,
    color: '#777',
    marginTop: 4,
  },

  status: {
    fontSize: 10,
    marginTop: 4,
    color: '#555',
  },

  emptyCard: {
    backgroundColor: '#eeeeee',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    marginTop: 10,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },

  emptyText: {
    color: '#777',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },

  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },

  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 20,
  },

  input: {
    height: 48,
    backgroundColor: '#eee',
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 12,
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },

  cancelButton: {
    padding: 14,
  },

  saveButton: {
    backgroundColor: '#111',
    borderRadius: 14,
    paddingHorizontal: 22,
    justifyContent: 'center',
  },

  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});