import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export default function NetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  const firstCheck = useRef(true);
  const previousConnection = useRef(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const state = await NetInfo.fetch();

        const connected =
          state.isConnected === true &&
          state.isInternetReachable !== false;

        setIsConnected(connected);

        if (!firstCheck.current) {
          if (!connected && previousConnection.current) {
            Alert.alert(
              'No Internet Connection',
              'SECURTAP cannot connect to the server right now. Please check your Wi-Fi or mobile data.'
            );

            setShowBanner(true);
          }

          if (connected && !previousConnection.current) {
            Alert.alert(
              'Connection Restored',
              'Your internet connection has been restored.'
            );

            setShowBanner(false);
          }
        }

        previousConnection.current = connected;
        firstCheck.current = false;
      } catch (error) {
        console.log('Network check error:', error);
      }
    };

    checkConnection();

    const unsubscribe = NetInfo.addEventListener(state => {
      const connected =
        state.isConnected === true &&
        state.isInternetReachable !== false;

      setIsConnected(connected);

      if (!firstCheck.current) {
        if (!connected && previousConnection.current) {
          Alert.alert(
            'No Internet Connection',
            'SECURTAP cannot connect to the server right now. Please check your Wi-Fi or mobile data.'
          );

          setShowBanner(true);
        }

        if (connected && !previousConnection.current) {
          Alert.alert(
            'Connection Restored',
            'Your internet connection has been restored.'
          );

          setShowBanner(false);
        }
      }

      previousConnection.current = connected;
      firstCheck.current = false;
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (!showBanner || isConnected) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>
        No internet connection
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#222',
    paddingVertical: 8,
    paddingHorizontal: 15,
    zIndex: 9999,
    elevation: 9999,
  },

  bannerText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
});