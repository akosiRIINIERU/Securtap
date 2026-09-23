import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabase, getSupabaseErrorMessage } from '../lib/supabase';

export default function ResetPasswordScreen({ onPasswordUpdated }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert(
        'Missing Information',
        'Please enter your new password twice.'
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        'Password Too Short',
        'Your password must contain at least 6 characters.'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        'Passwords Do Not Match',
        'Please make sure both password fields are the same.'
      );
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        Alert.alert(
          'Password Reset Failed',
          getSupabaseErrorMessage(error)
        );
        return;
      }

      Alert.alert(
        'Password Updated',
        'Your SECURTAP password has been changed successfully.',
        [
          {
            text: 'Continue',
            onPress: () => {
              if (onPasswordUpdated) {
                onPasswordUpdated();
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Reset Error',
        getSupabaseErrorMessage(error)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>

        <View style={styles.iconCircle}>
          <Text style={styles.lockIcon}>🔐</Text>
        </View>

        <Text style={styles.title}>
          Reset Password
        </Text>

        <Text style={styles.description}>
          Create a new password for your SECURTAP admin account.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="New password"
          placeholderTextColor="#888"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm new password"
          placeholderTextColor="#888"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          autoCapitalize="none"
          editable={!loading}
        />

        <Text style={styles.requirement}>
          Password must contain at least 6 characters.
        </Text>

        <TouchableOpacity
          style={[
            styles.button,
            loading && styles.disabledButton,
          ]}
          onPress={handleUpdatePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>
              Update Password
            </Text>
          )}
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    padding: 24,
  },

  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },

  lockIcon: {
    fontSize: 30,
  },

  title: {
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '800',
    color: '#111111',
  },

  description: {
    textAlign: 'center',
    color: '#666666',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 24,
  },

  input: {
    height: 52,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#111111',
    marginBottom: 14,
  },

  requirement: {
    color: '#777777',
    fontSize: 12,
    marginBottom: 18,
  },

  button: {
    height: 52,
    backgroundColor: '#111111',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  disabledButton: {
    opacity: 0.6,
  },

  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});