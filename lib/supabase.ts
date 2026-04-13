import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://xsprvlayjncbxhhhifnn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcHJ2bGF5am5jYnhoaGhpZm5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTAyMjIsImV4cCI6MjA5MTU4NjIyMn0.jhOvoBVj7Y_e3dOjtx9rCQiEGnv6H-1bXiDAksSgv_A';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
