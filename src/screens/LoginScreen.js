import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { getSupabaseErrorMessage } from '../lib/supabase';

export default function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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

    const {
      data,
      error,
    } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      Alert.alert(
        'Login Failed',
        getSupabaseErrorMessage(error)
      );
      return;
    }

    if (!data?.session) {
      Alert.alert(
        'Login Failed',
        'A login session could not be created. Please try again.'
      );
      return;
    }

    onLoginSuccess(data.session);

  } catch (error) {
    console.log('Login error:', error);

    Alert.alert(
      'Connection Error',
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

        <Text style={styles.brandTitle}>SECURTAP</Text>
        <Text style={styles.welcomeText}>Welcome!</Text>

        <TextInput
          style={styles.input}
          placeholder="Admin Email"
          placeholderTextColor="#888"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.loginButtonText}>Log In</Text>
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
    paddingHorizontal: 20,
  },

  loginCard: {
    backgroundColor: '#e0e0e0',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },

  logoBox: {
    width: 140,
    height: 90,
    borderWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },

  xText: {
    fontSize: 40,
    color: '#444',
  },

  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },

  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },

  input: {
    width: '100%',
    height: 45,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    marginBottom: 15,
  },

  loginButton: {
    backgroundColor: '#fff',
    minWidth: 100,
    height: 45,
    paddingHorizontal: 30,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginTop: 10,
  },

  loginButtonText: {
    fontWeight: '600',
    color: '#000',
  },
});