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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  supabase,
  getSupabaseErrorMessage,
} from '../lib/supabase';

export default function SignUpScreen({ onBackToLogin }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);

  const isValidGmail = (value) => {
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
    return gmailRegex.test(value.trim());
  };

  const handleSignUp = async () => {
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Full name
    if (!cleanName) {
      Alert.alert(
        'Missing Name',
        'Please enter your full name.'
      );
      return;
    }

    // Gmail
    if (!cleanEmail) {
      Alert.alert(
        'Missing Gmail',
        'Please enter your Gmail address.'
      );
      return;
    }

    if (!isValidGmail(cleanEmail)) {
      Alert.alert(
        'Invalid Gmail',
        'Please use a valid Gmail address ending with @gmail.com.'
      );
      return;
    }

    // Password
    if (!password) {
      Alert.alert(
        'Missing Password',
        'Please create a password.'
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

    // Confirm password
    if (!confirmPassword) {
      Alert.alert(
        'Confirm Password',
        'Please enter your password again.'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        'Passwords Do Not Match',
        'The two passwords must be the same.'
      );
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,

        options: {
          data: {
            full_name: cleanName,
          },

          emailRedirectTo: 'securtap://reset-password',
        },
      });

      if (error) {
        console.error('Sign up error:', error);

        Alert.alert(
          'Sign Up Failed',
          getSupabaseErrorMessage(error)
        );

        return;
      }

      /*
       * With email confirmation enabled,
       * Supabase normally returns a user but
       * no active session until the email is verified.
       */
      if (data?.user && !data?.session) {
        Alert.alert(
          'Check Your Gmail',
          `A verification email has been sent to ${cleanEmail}.\n\nPlease open Gmail and verify your email address before logging in.`,
          [
            {
              text: 'Go to Login',
              onPress: onBackToLogin,
            },
          ]
        );

        return;
      }

      /*
       * If email confirmation is disabled,
       * Supabase may immediately create a session.
       *
       * We still send the user back to Login so
       * the normal SECURTAP login flow is used.
       */
      Alert.alert(
        'Account Created',
        'Your SECURTAP account has been created successfully.',
        [
          {
            text: 'Go to Login',
            onPress: onBackToLogin,
          },
        ]
      );
    } catch (error) {
      console.error('Unexpected sign up error:', error);

      Alert.alert(
        'Sign Up Error',
        getSupabaseErrorMessage(error)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>

          {/* Logo */}
          <View style={styles.logoBox}>
            <Text style={styles.xText}>✕</Text>
          </View>

          <Text style={styles.brandTitle}>
            SECURTAP
          </Text>

          <Text style={styles.title}>
            Create Account
          </Text>

          <Text style={styles.subtitle}>
            Create your SECURTAP admin account
          </Text>

          {/* Full Name */}
          <Text style={styles.label}>
            Full Name
          </Text>

          <View style={styles.inputContainer}>
            <Ionicons
              name="person-outline"
              size={19}
              color="#777"
            />

            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#888"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              editable={!loading}
            />
          </View>

          {/* Gmail */}
          <Text style={styles.label}>
            Gmail Address
          </Text>

          <View style={styles.inputContainer}>
            <Ionicons
              name="mail-outline"
              size={19}
              color="#777"
            />

            <TextInput
              style={styles.input}
              placeholder="example@gmail.com"
              placeholderTextColor="#888"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          {/* Password */}
          <Text style={styles.label}>
            Password
          </Text>

          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={19}
              color="#777"
            />

            <TextInput
              style={styles.input}
              placeholder="Create a password"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          {/* Confirm Password */}
          <Text style={styles.label}>
            Confirm Password
          </Text>

          <View style={styles.inputContainer}>
            <Ionicons
              name="shield-checkmark-outline"
              size={19}
              color="#777"
            />

            <TextInput
              style={styles.input}
              placeholder="Enter password again"
              placeholderTextColor="#888"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <Text style={styles.requirement}>
            Password must contain at least 6 characters.
          </Text>

          {/* Create Account */}
          <TouchableOpacity
            style={[
              styles.signupButton,
              loading && styles.disabledButton,
            ]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.signupButtonText}>
                Create Account
              </Text>
            )}
          </TouchableOpacity>

          {/* Gmail information */}
          <View style={styles.infoBox}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#555"
            />

            <Text style={styles.infoText}>
              Your Gmail must be verified before you can
              use your SECURTAP account. The same Gmail
              will be used for password recovery.
            </Text>
          </View>

          {/* Back to Login */}
          <View style={styles.loginRow}>
            <Text style={styles.loginLabel}>
              Already have an account?
            </Text>

            <TouchableOpacity
              onPress={onBackToLogin}
              disabled={loading}
            >
              <Text style={styles.loginLink}>
                Log In
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },

  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    padding: 24,
  },

  logoBox: {
    width: 65,
    height: 65,
    borderRadius: 17,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 15,
  },

  xText: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '700',
  },

  brandTitle: {
    textAlign: 'center',
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#111111',
  },

  title: {
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '800',
    color: '#111111',
    marginTop: 20,
  },

  subtitle: {
    textAlign: 'center',
    color: '#777777',
    fontSize: 14,
    marginTop: 5,
    marginBottom: 25,
  },

  label: {
    color: '#333333',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 7,
  },

  inputContainer: {
    height: 52,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 15,
  },

  input: {
    flex: 1,
    height: '100%',
    marginLeft: 10,
    color: '#111111',
    fontSize: 15,
  },

  requirement: {
    color: '#777777',
    fontSize: 12,
    marginTop: -3,
    marginBottom: 18,
  },

  signupButton: {
    height: 52,
    backgroundColor: '#111111',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  disabledButton: {
    opacity: 0.6,
  },

  signupButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e9e9e9',
    borderRadius: 12,
    padding: 12,
    marginTop: 15,
  },

  infoText: {
    flex: 1,
    color: '#555555',
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 8,
  },

  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },

  loginLabel: {
    color: '#666666',
    fontSize: 13,
  },

  loginLink: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 5,
  },
});