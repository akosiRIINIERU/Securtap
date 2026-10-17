
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, getSupabaseErrorMessage } from '../lib/supabase';

export default function OtpVerificationScreen({
  email,
  onVerified,
  onBackToSignUp,
}) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const verifyCode = async () => {
    const cleanToken = token.trim();
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert(
        'Missing Email',
        'Your email address is missing. Return to registration and try again.'
      );
      return;
    }

    if (!/^\d{6}$/.test(cleanToken)) {
      Alert.alert(
        'Invalid Code',
        'Please enter the six-digit code sent to your Gmail.'
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'signup',
      });

      if (error) {
        Alert.alert(
          'Verification Failed',
          getSupabaseErrorMessage(error)
        );
        return;
      }

      if (!data?.user) {
        Alert.alert(
          'Verification Incomplete',
          'Supabase did not return a verified user. Please try again.'
        );
        return;
      }

      Alert.alert(
        'Email Verified',
        'Your SECURTAP email has been verified successfully.'
      );

      // Let App.js update its authentication screen.
      // Supabase's auth-state listener should handle the new session.
      if (typeof onVerified === 'function') {
        onVerified(data);
      }
    } catch (error) {
      console.error('OTP verification error:', error);

      Alert.alert(
        'Verification Error',
        getSupabaseErrorMessage(error)
      );
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert(
        'Missing Email',
        'Return to registration and enter your email again.'
      );
      return;
    }

    setResending(true);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
      });

      if (error) {
        Alert.alert(
          'Unable to Resend',
          getSupabaseErrorMessage(error)
        );
        return;
      }

      setToken('');

      Alert.alert(
        'New Code Requested',
        'Check your Gmail inbox and spam folder. Use the latest code you receive.'
      );
    } catch (error) {
      console.error('Resend OTP error:', error);

      Alert.alert(
        'Resend Error',
        getSupabaseErrorMessage(error)
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <View style={styles.logoBox}>
            <Ionicons
              name="mail-outline"
              size={32}
              color="#ffffff"
            />
          </View>

          <Text style={styles.brandTitle}>
            SECURTAP
          </Text>

          <Text style={styles.title}>
            Verify Your Gmail
          </Text>

          <Text style={styles.subtitle}>
            Enter the six-digit verification code sent to:
          </Text>

          <Text style={styles.email}>
            {email}
          </Text>

          <Text style={styles.label}>
            Verification Code
          </Text>

          <TextInput
            style={styles.otpInput}
            value={token}
            onChangeText={(value) =>
              setToken(value.replace(/\D/g, '').slice(0, 6))
            }
            placeholder="000000"
            placeholderTextColor="#999999"
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            editable={!loading && !resending}
            accessibilityLabel="Six-digit email verification code"
          />

          <TouchableOpacity
            style={[
              styles.primaryButton,
              (loading || resending) && styles.disabledButton,
            ]}
            onPress={verifyCode}
            disabled={loading || resending}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Verify Account
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>
              Didn't receive the code?
            </Text>

            <TouchableOpacity
              onPress={resendCode}
              disabled={loading || resending}
            >
              {resending ? (
                <ActivityIndicator color="#111111" />
              ) : (
                <Text style={styles.resendLink}>
                  Resend
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackToSignUp}
            disabled={loading || resending}
          >
            <Ionicons
              name="arrow-back-outline"
              size={17}
              color="#111111"
            />
            <Text style={styles.backButtonText}>
              Back to Registration
            </Text>
          </TouchableOpacity>

          <Text style={styles.infoText}>
            Only the latest valid verification code should be used.
            Never share your code with anyone.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  keyboardContainer: {
    flex: 1,
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

  brandTitle: {
    textAlign: 'center',
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#111111',
  },

  title: {
    textAlign: 'center',
    fontSize: 25,
    fontWeight: '800',
    color: '#111111',
    marginTop: 20,
  },

  subtitle: {
    textAlign: 'center',
    color: '#777777',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },

  email: {
    textAlign: 'center',
    color: '#111111',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 25,
  },

  label: {
    color: '#333333',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },

  otpInput: {
    height: 58,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: 10,
    textAlign: 'center',
    color: '#111111',
    marginBottom: 18,
  },

  primaryButton: {
    height: 52,
    backgroundColor: '#111111',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  disabledButton: {
    opacity: 0.6,
  },

  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 22,
    gap: 6,
  },

  resendLabel: {
    color: '#666666',
    fontSize: 13,
  },

  resendLink: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '800',
  },

  backButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 7,
  },

  backButtonText: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '700',
  },

  infoText: {
    color: '#777777',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 22,
  },
});
