import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  supabase,
  getSupabaseErrorMessage,
} from '../lib/supabase';

export default function LoginScreen({
  onLoginSuccess,
  onForgotPassword,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      Alert.alert(
        'Missing Information',
        'Please enter your email and password.'
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (error) {
        console.error('Login error:', error);
        throw error;
      }

      if (!data?.session) {
        Alert.alert(
          'Login Failed',
          'No active session was created. Please try again.'
        );
        return;
      }

      onLoginSuccess(data.session);
    } catch (error) {
      console.error('Login error:', error);

      Alert.alert(
        'Login Failed',
        getSupabaseErrorMessage(error)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loginCard}>

        <View style={styles.logoBox}>
          <Text style={styles.xText}>✕</Text>
        </View>

        <Text style={styles.welcomeText}>
          Welcome!
        </Text>

        <Text style={styles.subtitle}>
          Sign in to your SECURTAP admin account
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />

        <TouchableOpacity
          style={styles.forgotButton}
          onPress={onForgotPassword}
          disabled={loading}
        >
          <Text style={styles.forgotText}>
            Forgot Password?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.loginButton,
            loading && styles.disabledButton,
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>
              Log In
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
    backgroundColor: '#fff',
    justifyContent: 'center',
    padding: 20,
  },

  loginCard: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },

  logoBox: {
    width: 75,
    height: 75,
    borderRadius: 20,
    backgroundColor: '#111',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },

  xText: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800',
  },

  welcomeText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 28,
  },

  input: {
    height: 55,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111',
    marginBottom: 14,
  },

  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },

  forgotText: {
    color: '#111',
    fontSize: 14,
    fontWeight: '600',
  },

  loginButton: {
    height: 55,
    borderRadius: 14,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },

  disabledButton: {
    opacity: 0.6,
  },

  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});