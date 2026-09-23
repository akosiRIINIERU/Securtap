import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

/*
 * Converts Supabase/network errors into
 * user-friendly messages.
 */
export function getSupabaseErrorMessage(error) {
  if (!error) {
    return 'An unknown error occurred.';
  }

  const message = error.message?.toLowerCase() || '';

  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('internet') ||
    message.includes('failed to fetch') ||
    message.includes('connection')
  ) {
    return 'No internet connection. Please check your Wi-Fi or mobile data and try again.';
  }

  if (message.includes('jwt')) {
    return 'Your session has expired. Please log in again.';
  }

  if (message.includes('invalid login credentials')) {
    return 'The email or password is incorrect.';
  }

  if (message.includes('email not confirmed')) {
    return 'Please verify your email before logging in.';
  }

  if (message.includes('permission denied')) {
    return 'You do not have permission to perform this action.';
  }

  if (message.includes('row-level security')) {
    return 'You do not have permission to access this data.';
  }

  if (message.includes('timeout')) {
    return 'The request took too long. Please try again.';
  }

  return error.message || 'Something went wrong. Please try again.';
}