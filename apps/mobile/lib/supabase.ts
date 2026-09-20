import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://zayfypmgkjedxqyjebem.supabase.co';

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_LaizzttODEpbJk53_C6BPw_q3hBmHXE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
