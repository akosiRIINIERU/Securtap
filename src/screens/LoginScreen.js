import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView } from 'react-native';

export default function LoginScreen({ onLoginSuccess }) {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loginCard}>
        {/* Placeholder Box for Logo */}
        <View style={styles.logoBox}>
          <Text style={styles.xText}>✕</Text>
        </View>

        <Text style={styles.welcomeText}>Welcome!</Text>

        <TextInput
          style={styles.input}
          placeholder="Admin ID"
          placeholderTextColor="#888"
          value={adminId}
          onChangeText={setAdminId}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.loginButton} onPress={onLoginSuccess}>
          <Text style={styles.loginButtonText}>Log In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', paddingHorizontal: 20 },
  loginCard: { backgroundColor: '#e0e0e0', borderRadius: 24, padding: 24, alignItems: 'center' },
  logoBox: { width: 140, height: 90, borderWidth: 1, borderColor: '#000', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  xText: { fontSize: 40, color: '#444' },
  welcomeText: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { width: '100%', height: 45, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, marginBottom: 15 },
  loginButton: { backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 30, borderRadius: 20, alignSelf: 'flex-end', marginTop: 10 },
  loginButtonText: { fontWeight: '600', color: '#000' },
});