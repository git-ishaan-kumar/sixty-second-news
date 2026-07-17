'use server';

import { createClient } from '@/utils/supabase/server';

export interface ActionResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export async function resetPasswordAction(
  email: string,
  origin: string
): Promise<ActionResponse> {
  // 1. Input Presence & Format Verification
  if (!email) {
    return { success: false, error: 'Email address is required.' };
  }

  const trimmedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  if (!origin) {
    return { success: false, error: 'Origin verification failed.' };
  }

  try {
    const supabase = await createClient();
    
    // 2. Trigger Supabase Password Reset with PKCE Redirect
    const redirectTo = `${origin}/auth/callback?next=/profile`;
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo,
    });

    if (error) {
      console.error('Supabase resetPasswordForEmail error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: 'A password reset link has been sent to your email address.',
    };
  } catch (err: any) {
    console.error('Password reset action exception:', err);
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred. Please try again.',
    };
  }
}
