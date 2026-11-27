import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** True when .env holds Supabase credentials. Until then the app runs on sample data. */
export const isSupabaseConfigured = Boolean(url && anonKey);

// Web pages are pre-rendered in Node, where there is no window or storage.
const isServerRender = Platform.OS === 'web' && typeof window === 'undefined';

export const supabase: SupabaseClient | null = isSupabaseConfigured && !isServerRender
  ? createClient(url!, anonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
