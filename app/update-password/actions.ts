'use server';

import { createClient } from '@/utils/supabase/server';

export interface ActionResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export async function updatePasswordAction(
  password: string,
  confirmPassword: string
): Promise<ActionResponse> {
  // 1. Input Validation
  if (!password || !confirmPassword) {
    return { success: false, error: 'All fields are required.' };
  }

  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters.' };
  }

  if (password.length > 72) {
    return { success: false, error: 'Password cannot exceed 72 characters.' };
  }

  if (password !== confirmPassword) {
    return { success: false, error: 'Passwords do not match.' };
  }

  // Password complexity check: must contain at least one uppercase letter, one lowercase letter, and one number
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return {
      success: false,
      error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
    };
  }

  try {
    const supabase = await createClient();

    // Verify session exists
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Your session has expired or is invalid. Please request a new reset link.' };
    }

    // 2. Perform Password Update
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      console.error('Supabase updateUser password error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: 'Your password has been successfully updated.',
    };
  } catch (err: any) {
    console.error('Update password action exception:', err);
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred. Please try again.',
    };
  }
}
