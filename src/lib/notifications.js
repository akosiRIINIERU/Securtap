import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Show alerts even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let currentToken = null;

// Asks for permission, gets this phone's Expo push token, and saves it so the
// server can notify this admin. Safe to call repeatedly.
export async function registerForPush(userId) {
  try {
    if (!userId || !Device.isDevice) {
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Lock activity',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    let { status } = await Notifications.getPermissionsAsync();

    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }

    if (status !== 'granted') {
      return null;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    if (!projectId) {
      console.warn(
        'Push notifications need an EAS project ID in app.json (extra.eas.projectId).'
      );
      return null;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    const { error } = await supabase.from('admin_push_tokens').upsert(
      {
        admin_id: userId,
        expo_push_token: token,
        device_label: Device.modelName || Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'expo_push_token' }
    );

    if (error) {
      console.error('Saving push token failed:', error.message);
      return null;
    }

    currentToken = token;
    return token;
  } catch (error) {
    console.warn('Push registration failed:', error?.message);
    return null;
  }
}

// Stops notifications for this phone (used on logout or when turned off).
export async function unregisterPush() {
  try {
    if (!currentToken) {
      return;
    }

    await supabase
      .from('admin_push_tokens')
      .delete()
      .eq('expo_push_token', currentToken);

    currentToken = null;
  } catch (error) {
    console.warn('Push unregister failed:', error?.message);
  }
}
