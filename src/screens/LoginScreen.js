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

import {
  supabase,
  getSupabaseErrorMessage,
} from '../lib/supabase';

export default function LoginScreen({
  onLoginSuccess,
  onSignUp,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // =========================
  // LOGIN
  // =========================

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      Alert.alert(
        'Missing Information',
        'Please enter your Gmail and password.'
      );
      return;
    }

    try {
      setLoading(true);

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (error) {
        console.error('Login error:', error);

        Alert.alert(
          'Login Failed',
          getSupabaseErrorMessage(error)
        );

        return;
      }

      if (data?.session) {
        onLoginSuccess(data.session);
      }
    } catch (error) {
      console.error('Unexpected login error:', error);

      Alert.alert(
        'Login Error',
        getSupabaseErrorMessage(error)
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // FORGOT PASSWORD
  // =========================

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert(
        'Enter Your Gmail',
        'Please enter your Gmail address in the email field first.'
      );
      return;
    }

    if (!cleanEmail.endsWith('@gmail.com')) {
      Alert.alert(
        'Invalid Gmail',
        'Please enter a valid Gmail address.'
      );
      return;
    }

    try {
      setForgotLoading(true);

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo: 'securtap://reset-password',
          }
        );

      if (error) {
        console.error(
          'Password recovery error:',
          error
        );

        Alert.alert(
          'Unable to Send Reset Email',
          getSupabaseErrorMessage(error)
        );

        return;
      }

      Alert.alert(
        'Reset Email Sent',
        `A password reset email has been sent to ${cleanEmail}.\n\nOpen Gmail and follow the instructions to reset your SECURTAP password.`
      );
    } catch (error) {
      console.error(
        'Unexpected password recovery error:',
        error
      );

      Alert.alert(
        'Reset Error',
        getSupabaseErrorMessage(error)
      );
    } finally {
      setForgotLoading(false);
    }
  };

  // =========================
  // UI
  // =========================

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loginCard}>

        {/* LOGO */}
        <View style={styles.logoBox}>
          <Text style={styles.xText}>✕</Text>
        </View>

        {/* BRAND */}
        <Text style={styles.brandTitle}>
          SECURTAP
        </Text>

        <Text style={styles.welcomeText}>
          Welcome!
        </Text>

        <Text style={styles.subtitle}>
          Admin Login
        </Text>

        {/* EMAIL */}
        <View style={styles.inputContainer}>
          <Ionicons
            name="mail-outline"
            size={20}
            color="#777"
          />

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
        </View>

        {/* PASSWORD */}
        <View style={styles.inputContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color="#777"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading && !forgotLoading}
          />

          <TouchableOpacity
            onPress={() =>
              setShowPassword(!showPassword)
            }
            disabled={loading || forgotLoading}
          >
            <Ionicons
              name={
                showPassword
                  ? 'eye-off-outline'
                  : 'eye-outline'
              }
              size={21}
              color="#777"
            />
          </TouchableOpacity>
        </View>

        {/* LOGIN BUTTON */}
        <TouchableOpacity
          style={[
            styles.loginButton,
            loading && styles.disabledButton,
          ]}
          onPress={handleLogin}
          disabled={loading || forgotLoading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.loginButtonText}>
              Log In
            </Text>
          )}
        </TouchableOpacity>

        {/* FORGOT PASSWORD */}
        <TouchableOpacity
          style={styles.forgotButton}
          onPress={handleForgotPassword}
          disabled={loading || forgotLoading}
        >
          {forgotLoading ? (
            <ActivityIndicator
              size="small"
              color="#111111"
            />
          ) : (
            <Text style={styles.forgotText}>
              Forgot Password?
            </Text>
          )}
        </TouchableOpacity>

        {/* SIGN UP */}
        <View style={styles.signupRow}>
          <Text style={styles.signupLabel}>
            Don't have an account?
          </Text>

          <TouchableOpacity
            onPress={onSignUp}
            disabled={loading || forgotLoading}
          >
            <Text style={styles.signupLink}>
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>

        {/* INFORMATION */}
        <View style={styles.infoBox}>
          <Ionicons
            name="mail-outline"
            size={19}
            color="#555"
          />

          <Text style={styles.infoText}>
            Your Gmail address is used for account
            verification and password recovery.
          </Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

// =========================
// STYLES
// =========================

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

  inputContainer: {
    height: 52,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  input: {
    flex: 1,
    height: '100%',
    marginLeft: 10,
    paddingVertical: 0,
    fontSize: 15,
    color: '#111111',
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

  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },

  signupLabel: {
    color: '#666666',
    fontSize: 13,
  },

  signupLink: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 5,
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e9e9e9',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },

  infoText: {
    flex: 1,
    marginLeft: 8,
    color: '#555555',
    fontSize: 12,
    lineHeight: 18,
  },
});