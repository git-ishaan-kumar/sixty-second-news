'use server';

import { createClient, createAdminClient } from '@/utils/supabase/server';

export interface ActionResponse {
  success: boolean;
  error?: string;
  redirect?: string;
}

const PASSWORD_BLACKLIST = [
  '12345678',
  '123456789',
  'password',
  'password123',
  'qwerty123',
  'qwertyuiop',
  'letmein123',
  'admin123',
  'welcome123',
  'sixtysecondnews',
];

export async function signUpAction(formData: FormData): Promise<ActionResponse> {
  const username = formData.get('username') as string | null;
  const email = formData.get('email') as string | null;
  const password = formData.get('password') as string | null;
  const confirmPassword = formData.get('confirmPassword') as string | null;
  const turnstileToken = formData.get('turnstileToken') as string | null;

  // 1. Inputs Presence Check
  if (!username || !email || !password || !confirmPassword) {
    return { success: false, error: 'All fields are required.' };
  }

  // 2. Username Validation
  const trimmedUsername = username.trim();
  if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
    return { success: false, error: 'Username must be between 3 and 20 characters.' };
  }
  const usernameRegex = /^[a-zA-Z0-9_\.-]+$/;
  if (!usernameRegex.test(trimmedUsername)) {
    return { success: false, error: 'Username can only contain alphanumeric characters, underscores, periods, and hyphens.' };
  }

  // 3. Email Validation
  const trimmedEmail = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  // 4. Password Validation
  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters.' };
  }
  if (password.length > 72) {
    return { success: false, error: 'Password cannot exceed 72 characters.' };
  }
  if (PASSWORD_BLACKLIST.includes(password.toLowerCase())) {
    return { success: false, error: 'Password is too common or easy to guess.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { success: false, error: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { success: false, error: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { success: false, error: 'Password must contain at least one number.' };
  }

  // 4b. Confirm Password Match Check
  if (password !== confirmPassword) {
    return { success: false, error: 'Passwords do not match.' };
  }

  // 5. Turnstile Token Validation
  if (!turnstileToken) {
    return { success: false, error: 'Security verification is required.' };
  }

  // 6. Turnstile Verification
  if (process.env.TURNSTILE_SECRET_KEY) {
    try {
      const verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
      const verifyRes = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: turnstileToken,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        return { success: false, error: 'Security verification failed. Please try again.' };
      }
    } catch (e) {
      console.error('Turnstile verification error:', e);
      return { success: false, error: 'Security service unavailable. Please try again later.' };
    }
  }

  // 7. Username Uniqueness Check (using admin client to bypass RLS restrictions)
  try {
    const adminSupabase = createAdminClient();
    const { data: existingProfile, error: profileErr } = await adminSupabase
      .from('profiles')
      .select('username')
      .eq('username', trimmedUsername)
      .maybeSingle();

    if (profileErr) {
      console.error('Error checking username uniqueness:', profileErr);
    }

    if (existingProfile) {
      return { success: false, error: 'Username is already taken.' };
    }
  } catch (e) {
    console.error('Profile query database error:', e);
  }

  // 8. Sign Up via Supabase Auth
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: password,
      options: {
        captchaToken: turnstileToken,
        data: {
          username: trimmedUsername,
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Success response - redirect to home page as the session will be active (email confirm links disabled)
    return { success: true, redirect: '/' };
  } catch (e: any) {
    console.error('Sign up error:', e);
    return { success: false, error: e?.message || 'An unexpected error occurred during sign up.' };
  }
}
