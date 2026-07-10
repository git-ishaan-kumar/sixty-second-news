'use server';

import { createClient, createAdminClient } from '@/utils/supabase/server';

export interface ActionResponse {
  success: boolean;
  error?: string;
  redirect?: string;
}

export async function loginAction(formData: FormData): Promise<ActionResponse> {
  const emailOrUsername = formData.get('emailOrUsername') as string | null;
  const password = formData.get('password') as string | null;

  // 1. Inputs Presence Check
  if (!emailOrUsername || !password) {
    return { success: false, error: 'All fields are required.' };
  }

  const trimmedIdentifier = emailOrUsername.trim();
  let email = trimmedIdentifier;

  // 2. Username to Email Resolution Loop
  if (!trimmedIdentifier.includes('@')) {
    try {
      const adminSupabase = createAdminClient();
      const { data: profile, error: profileErr } = await adminSupabase
        .from('profiles')
        .select('email')
        .eq('username', trimmedIdentifier)
        .maybeSingle();

      if (profileErr) {
        console.error('Error fetching email by username:', profileErr);
        return { success: false, error: 'Database authentication error. Please try again.' };
      }

      if (!profile || !profile.email) {
        // Return generic error to prevent username harvesting/enumeration
        return { success: false, error: 'Invalid username/email or password.' };
      }

      email = profile.email;
    } catch (e) {
      console.error('Database query exception during login:', e);
      return { success: false, error: 'An unexpected database error occurred.' };
    }
  }

  // 3. Authenticate via Supabase Auth
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Handle standard authentication error cases
      return { success: false, error: error.message };
    }

    return { success: true, redirect: '/' };
  } catch (e: any) {
    console.error('Login authentication exception:', e);
    return { success: false, error: e?.message || 'An unexpected error occurred during login.' };
  }
}
