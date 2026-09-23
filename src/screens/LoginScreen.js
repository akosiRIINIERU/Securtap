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
import { Ionicons } from '@expo/vector-icons';
import { supabase, getSupabaseErrorMessage } from '../lib/supabase';

export default function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert(
        'Missing Information',
        'Please enter your email and password.'
      );
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        Alert.alert('Login Failed', getSupabaseErrorMessage(error));
        return;
      }

      if (data?.session) {
        onLoginSuccess(data.session);
      }
    } catch (error) {
      Alert.alert('Login Error', getSupabaseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      Alert.alert(
        'Enter Your Gmail',
        'Please enter your Gmail address in the email field first.'
      );
      return;
    }

    try {
      setForgotLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo: 'securtap://reset-password',
        }
      );

      if (error) {
        Alert.alert(
          'Unable to Send Reset Email',
          getSupabaseErrorMessage(error)
        );
        return;
      }

      Alert.alert(
        'Reset Email Sent',
        `A password reset link has been sent to ${cleanEmail}.\n\nOpen Gmail and tap the link to reset your SECURTAP password.`
      );
    } catch (error) {
      Alert.alert(
        'Reset Error',
        getSupabaseErrorMessage(error)
      );
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loginCard}>

        <View style={styles.logoBox}>
          <Text style={styles.xText}>✕</Text>
        </View>

        <Text style={styles.brandTitle}>SECURTAP</Text>

        <Text style={styles.welcomeText}>
          Welcome!
        </Text>

        <Text style={styles.subtitle}>
          Admin Login
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Gmail address"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!loading && !forgotLoading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          editable={!loading && !forgotLoading}
        />

        <TouchableOpacity
          style={[
            styles.loginButton,
            loading && styles.disabledButton,
          ]}
          onPress={handleLogin}
          disabled={loading || forgotLoading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>
              Log In
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.forgotButton}
          onPress={handleForgotPassword}
          disabled={loading || forgotLoading}
        >
          {forgotLoading ? (
            <ActivityIndicator size="small" color="#111" />
          ) : (
            <Text style={styles.forgotText}>
              Forgot Password?
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Ionicons
            name="mail-outline"
            size={18}
            color="#555"
          />

          <Text style={styles.infoText}>
            Your Gmail address is used to receive password
            recovery emails.
          </Text>
        </View>

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

  loginCard: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
  },

  logoBox: {
    width: 70,
    height: 70,
    borderRadius: 18,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 18,
  },

  xText: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '700',
  },

  brandTitle: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: 2,
  },

  welcomeText: {
    textAlign: 'center',
    fontSize: 27,
    fontWeight: '700',
    color: '#111111',
    marginTop: 20,
  },

  subtitle: {
    textAlign: 'center',
    color: '#777777',
    fontSize: 14,
    marginTop: 4,
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

  loginButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },

  disabledButton: {
    opacity: 0.6,
  },

  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  forgotButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginTop: 8,
  },

  forgotText: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '600',
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e9e9e9',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },

  infoText: {
    flex: 1,
    marginLeft: 8,
    color: '#555555',
    fontSize: 12,
    lineHeight: 18,
  },
});