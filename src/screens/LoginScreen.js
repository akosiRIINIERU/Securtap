import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ onLoginSuccess }) {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    if (!adminId.trim() || !password.trim()) {
      Alert.alert(
        'Missing Information',
        'Please enter your Admin ID and password.'
      );
      return;
    }

    // Temporary login.
    // Supabase authentication will replace this later.
    onLoginSuccess();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.loginCard}>
          {/* LOGO */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Ionicons
                name="shield-checkmark-outline"
                size={48}
                color="#111"
              />
            </View>

            <Text style={styles.brandTitle}>SECURTAP</Text>

            <Text style={styles.brandSubtitle}>
              Smart Access Management
            </Text>
          </View>

          {/* WELCOME */}
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>Welcome!</Text>

            <Text style={styles.description}>
              Sign in to manage your properties and smart locks.
            </Text>
          </View>

          {/* ADMIN ID */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Admin ID</Text>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={19}
                color="#777"
              />

              <TextInput
                style={styles.input}
                placeholder="Enter your Admin ID"
                placeholderTextColor="#999"
                value={adminId}
                onChangeText={setAdminId}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* PASSWORD */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={19}
                color="#777"
              />

              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />

              <TouchableOpacity
                onPress={() =>
                  setShowPassword(!showPassword)
                }
              >
                <Ionicons
                  name={
                    showPassword
                      ? 'eye-off-outline'
                      : 'eye-outline'
                  }
                  size={19}
                  color="#777"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* FORGOT PASSWORD */}
          <TouchableOpacity style={styles.forgotButton}>
            <Text style={styles.forgotText}>
              Forgot Password?
            </Text>
          </TouchableOpacity>

          {/* LOGIN */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>
              Log In
            </Text>

            <Ionicons
              name="arrow-forward"
              size={18}
              color="#fff"
            />
          </TouchableOpacity>

          <Text style={styles.footerText}>
            SECURTAP Admin Portal
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  loginCard: {
    backgroundColor: '#eeeeee',
    borderRadius: 25,
    padding: 22,
  },

  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },

  logoCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  brandSubtitle: {
    fontSize: 10,
    color: '#777',
    marginTop: 3,
  },

  welcomeContainer: {
    marginBottom: 20,
  },

  welcomeText: {
    fontSize: 24,
    fontWeight: '800',
  },

  description: {
    fontSize: 11,
    color: '#777',
    marginTop: 4,
    lineHeight: 16,
  },

  inputContainer: {
    marginBottom: 13,
  },

  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 5,
    color: '#333',
  },

  inputWrapper: {
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
  },

  input: {
    flex: 1,
    height: '100%',
    fontSize: 12,
    marginLeft: 9,
    color: '#111',
  },

  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 18,
  },

  forgotText: {
    fontSize: 10,
    color: '#555',
  },

  loginButton: {
    height: 50,
    borderRadius: 15,
    backgroundColor: '#111',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loginButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    marginRight: 7,
  },

  footerText: {
    textAlign: 'center',
    fontSize: 9,
    color: '#999',
    marginTop: 18,
  },
});