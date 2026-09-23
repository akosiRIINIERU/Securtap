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

export function getSupabaseErrorMessage(error) {
  if (!error) {
    return 'An unknown error occurred.';
  }

  // Log useful database information during development.
  console.error('Supabase error details:', {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
    status: error.status,
  });

  // Auth errors
  if (error.code === 'invalid_credentials') {
    return 'The email or password is incorrect.';
  }

  if (error.code === 'email_not_confirmed') {
    return 'Please verify your email before logging in.';
  }

  if (error.code === 'bad_jwt') {
    return 'Your session has expired. Please log in again.';
  }

  // Database permission error
  if (error.code === '42501') {
    return 'You do not have permission to access this data.';
  }

  // Common network errors
  const message =
    error.message?.toLowerCase() || '';

  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('internet') ||
    message.includes('failed to fetch') ||
    message.includes('connection')
  ) {
    return 'No internet connection. Please check your Wi-Fi or mobile data and try again.';
  }

  if (message.includes('timeout')) {
    return 'The request took too long. Please try again.';
  }

  if (
    message.includes('row-level security')
  ) {
    return 'You do not have permission to access this data.';
  }

  return (
    error.message ||
    'Something went wrong. Please try again.'
  );
}