/**
 * Test script to verify admin login credentials
 * Run this in development to test authentication
 */

import { supabase } from '@/lib/supabase';

const ADMIN_EMAIL = 'omaghraoui@gmail.com';
const ADMIN_PASSWORD = 'pilote';

export async function testAdminLogin() {
  console.log('========================================');
  console.log('Testing Admin Login');
  console.log('========================================');
  console.log('Email:', ADMIN_EMAIL);
  console.log('Password: ****** (length:', ADMIN_PASSWORD.length, ')');
  console.log('');

  // Step 1: Test environment
  console.log('1. Checking environment variables...');
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Environment variables missing!');
    return false;
  }
  console.log('✅ Environment variables configured');
  console.log('   URL:', supabaseUrl.substring(0, 30) + '...');
  console.log('');

  // Step 2: Test connection
  console.log('2. Testing connection to Supabase...');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }
    console.log('✅ Connection successful');
  } catch (error) {
    console.error('❌ Connection error:', error);
    return false;
  }
  console.log('');

  // Step 3: Test authentication
  console.log('3. Testing authentication...');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    if (error) {
      console.error('❌ Authentication failed:', error.message);
      console.error('   Status:', error.status);
      console.error('   Name:', error.name);
      return false;
    }

    if (!data.user) {
      console.error('❌ No user data returned');
      return false;
    }

    console.log('✅ Authentication successful');
    console.log('   User ID:', data.user.id);
    console.log('   Email:', data.user.email);
    console.log('');

    // Step 4: Test profile loading
    console.log('4. Testing profile loading...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('❌ Profile loading failed:', profileError.message);
      return false;
    }

    if (!profile) {
      console.error('❌ No profile found');
      return false;
    }

    console.log('✅ Profile loaded successfully');
    console.log('   Name:', profile.name);
    console.log('   Email:', profile.email);
    console.log('   Role:', profile.role);
    console.log('');

    // Step 5: Verify admin role
    console.log('5. Verifying admin role...');
    if (profile.role !== 'ADMIN') {
      console.error('❌ User is not an admin! Role:', profile.role);
      return false;
    }
    console.log('✅ Admin role confirmed');
    console.log('');

    // Cleanup - sign out
    await supabase.auth.signOut();

    console.log('========================================');
    console.log('✅ All tests passed!');
    console.log('Admin login is working correctly.');
    console.log('========================================');
    return true;
  } catch (error) {
    console.error('❌ Unexpected error during test:', error);
    return false;
  }
}

// Export for use in components
export const ADMIN_CREDENTIALS = {
  email: ADMIN_EMAIL,
  password: ADMIN_PASSWORD,
} as const;
