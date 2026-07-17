'use server';

import { createClient, createAdminClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export interface ActionResponse {
  success: boolean;
  error?: string;
  message?: string;
}

// 1. Update Username Server Action
export async function updateUsernameAction(username: string): Promise<ActionResponse> {
  if (!username) {
    return { success: false, error: 'Username is required.' };
  }

  const trimmedUsername = username.trim();
  if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
    return { success: false, error: 'Username must be between 3 and 20 characters.' };
  }

  const usernameRegex = /^[a-zA-Z0-9_\.-]+$/;
  if (!usernameRegex.test(trimmedUsername)) {
    return { success: false, error: 'Username can only contain alphanumeric characters, underscores, periods, and hyphens.' };
  }

  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: 'You must be logged in to update your username.' };
    }

    // Check if username is already taken by another user
    const adminSupabase = createAdminClient();
    const { data: existingProfile, error: profileErr } = await adminSupabase
      .from('profiles')
      .select('username, id')
      .eq('username', trimmedUsername)
      .maybeSingle();

    if (existingProfile && existingProfile.id !== session.user.id) {
      return { success: false, error: 'Username is already taken.' };
    }

    // Update profiles database row
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: trimmedUsername })
      .eq('id', session.user.id);

    if (updateError) {
      console.error('Database update error:', updateError);
      return { success: false, error: updateError.message };
    }

    revalidatePath('/profile');
    return { success: true, message: 'Username updated successfully.' };
  } catch (err: any) {
    console.error('Update username exception:', err);
    return { success: false, error: err?.message || 'An unexpected error occurred.' };
  }
}

// 2. Update Email Server Action
export async function updateEmailAction(email: string): Promise<ActionResponse> {
  if (!email) {
    return { success: false, error: 'Email address is required.' };
  }

  const trimmedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: 'You must be logged in to update your email.' };
    }

    if (session.user.email === trimmedEmail) {
      return { success: false, error: 'This is already your current email address.' };
    }

    // Update email - this triggers dynamic verification emails (PKCE recovery link routing)
    const { error } = await supabase.auth.updateUser({ email: trimmedEmail });

    if (error) {
      console.error('Supabase updateUser email error:', error);
      return { success: false, error: error.message };
    }

    return { 
      success: true, 
      message: 'Verification links have been sent to your new email address. Please check your inbox.' 
    };
  } catch (err: any) {
    console.error('Update email exception:', err);
    return { success: false, error: err?.message || 'An unexpected error occurred.' };
  }
}

// 3. Update Password Server Action
export async function updatePasswordAction(password: string, confirmPassword: string): Promise<ActionResponse> {
  if (!password || !confirmPassword) {
    return { success: false, error: 'All password fields are required.' };
  }

  if (password.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters.' };
  }

  if (password.length > 72) {
    return { success: false, error: 'New password cannot exceed 72 characters.' };
  }

  if (password !== confirmPassword) {
    return { success: false, error: 'Passwords do not match.' };
  }

  // Password complexity check
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return { success: false, error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number.' };
  }

  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: 'You must be logged in to change your password.' };
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      console.error('Supabase updateUser password error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, message: 'Password updated successfully.' };
  } catch (err: any) {
    console.error('Update password exception:', err);
    return { success: false, error: err?.message || 'An unexpected error occurred.' };
  }
}

// 4. Delete Account Server Action
export async function deleteAccountAction(password: string): Promise<ActionResponse> {
  if (!password) {
    return { success: false, error: 'Password is required to confirm identity.' };
  }

  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.user.email) {
      return { success: false, error: 'You must be logged in to delete your account.' };
    }

    // Re-authenticate user to verify password identity
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: password,
    });

    if (verifyError) {
      return { success: false, error: 'Incorrect password. Identity verification failed.' };
    }

    const adminSupabase = createAdminClient();
    
    // Delete user from auth database (Cascades to profile)
    const { error } = await adminSupabase.auth.admin.deleteUser(session.user.id);

    if (error) {
      console.error('Supabase admin deleteUser error:', error);
      return { success: false, error: error.message };
    }

    // Sign out local session
    await supabase.auth.signOut();

    return { success: true, message: 'Account successfully deleted.' };
  } catch (err: any) {
    console.error('Delete account exception:', err);
    return { success: false, error: err?.message || 'An unexpected error occurred.' };
  }
}
