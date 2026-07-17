'use client';

import React, { useState } from 'react';
import { 
  updateUsernameAction, 
  updateEmailAction, 
  updatePasswordAction, 
  deleteAccountAction 
} from '@/app/profile/actions';

interface Profile {
  id: string;
  email: string;
  username: string;
  created_at: string;
}

interface ProfileClientShellProps {
  initialProfile: Profile;
}

export default function ProfileClientShell({ initialProfile }: ProfileClientShellProps) {
  // Account Information State
  const [profile, setProfile] = useState<Profile>(initialProfile);

  // Forms Input State
  const [newUsername, setNewUsername] = useState(initialProfile.username);
  const [newEmail, setNewEmail] = useState(initialProfile.email);
  
  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirmPassword: '',
  });

  // State flags for process indicator
  const [isUsernamePending, setIsUsernamePending] = useState(false);
  const [isEmailPending, setIsEmailPending] = useState(false);
  const [isPasswordPending, setIsPasswordPending] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);

  // Success / Error status banners per section
  const [usernameStatus, setUsernameStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Account destruction warning dialog overlay
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationPassword, setDeleteConfirmationPassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Change Username Form Submission Handler
  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameStatus(null);
    setIsUsernamePending(true);

    try {
      const response = await updateUsernameAction(newUsername);
      if (response.success) {
        setUsernameStatus({ type: 'success', message: response.message || 'Username updated successfully.' });
        setProfile(prev => ({ ...prev, username: newUsername.trim() }));
      } else {
        setUsernameStatus({ type: 'error', message: response.error || 'Failed to update username.' });
      }
    } catch (err) {
      setUsernameStatus({ type: 'error', message: 'An unexpected error occurred.' });
    } finally {
      setIsUsernamePending(false);
    }
  };

  // Change Email Form Submission Handler
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailStatus(null);
    setIsEmailPending(true);

    try {
      const response = await updateEmailAction(newEmail);
      if (response.success) {
        setEmailStatus({ type: 'success', message: response.message || 'Verification link sent.' });
      } else {
        setEmailStatus({ type: 'error', message: response.error || 'Failed to update email.' });
      }
    } catch (err) {
      setEmailStatus({ type: 'error', message: 'An unexpected error occurred.' });
    } finally {
      setIsEmailPending(false);
    }
  };

  // Change Password Form Submission Handler
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setIsPasswordPending(true);

    try {
      const response = await updatePasswordAction(passwordForm.password, passwordForm.confirmPassword);
      if (response.success) {
        setPasswordStatus({ type: 'success', message: response.message || 'Password updated successfully.' });
        setPasswordForm({ password: '', confirmPassword: '' });
      } else {
        setPasswordStatus({ type: 'error', message: response.error || 'Failed to update password.' });
      }
    } catch (err) {
      setPasswordStatus({ type: 'error', message: 'An unexpected error occurred.' });
    } finally {
      setIsPasswordPending(false);
    }
  };

  // Delete Account Confirmation Handler
  const handleDeleteAccount = async () => {
    if (!deleteConfirmationPassword) {
      setDeleteError('Please enter your password to confirm identity.');
      return;
    }

    setDeleteError(null);
    setIsDeletePending(true);

    try {
      const response = await deleteAccountAction(deleteConfirmationPassword);
      if (response.success) {
        window.location.href = '/login?message=Your account has been deleted.';
      } else {
        setDeleteError(response.error || 'Failed to delete account.');
        setIsDeletePending(false);
      }
    } catch (err) {
      setDeleteError('An unexpected error occurred.');
      setIsDeletePending(false);
    }
  };

  const initialLetter = profile.username ? profile.username.charAt(0) : 'U';

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      
      {/* 1. Top Section: User avatar banner & Account details */}
      <div className="bg-[#16161A]/60 rounded-2xl border border-muted-slate/15 p-6 text-center space-y-4">
        {/* Avatar badge with the first letter of user handle */}
        <div className="relative w-24 h-24 bg-hyper-blue/10 border border-hyper-blue/30 text-hyper-blue rounded-full flex items-center justify-center text-4xl font-extrabold mx-auto uppercase shadow-lg select-none">
          {initialLetter}
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-pure-white truncate">@{profile.username}</h2>
          <p className="text-sm text-muted-slate truncate">{profile.email}</p>
        </div>
      </div>

      {/* 2. Bottom Section: Modification forms stacked in a single column */}
      <div className="space-y-8">
        
        {/* Form A: Change Username */}
        <div className="bg-[#16161A]/60 rounded-2xl border border-muted-slate/15 p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-pure-white">Update Username</h3>
          </div>

          <form onSubmit={handleUsernameSubmit} className="space-y-4">
            {usernameStatus && (
              <div className={`p-3 rounded-lg text-xs font-medium text-center border ${
                usernameStatus.type === 'success' 
                  ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {usernameStatus.message}
              </div>
            )}

            <div className="space-y-2">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => {
                  setNewUsername(e.target.value);
                  if (usernameStatus) setUsernameStatus(null);
                }}
                disabled={isUsernamePending}
                placeholder="New username"
                className="w-full px-4 py-2.5 rounded-lg bg-[#16161A] text-pure-white placeholder-muted-slate/50 border border-muted-slate/20 focus:border-hyper-blue focus:ring-1 focus:ring-hyper-blue outline-none transition-all duration-200 text-sm"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUsernamePending || newUsername.trim() === initialProfile.username}
                className="px-5 py-2 rounded-lg bg-hyper-blue hover:bg-hyper-blue/90 disabled:opacity-40 text-pure-white text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer"
              >
                {isUsernamePending ? 'Saving...' : 'Update Username'}
              </button>
            </div>
          </form>
        </div>

        {/* Form B: Update Email */}
        <div className="bg-[#16161A]/60 rounded-2xl border border-muted-slate/15 p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-pure-white">Change Email Address</h3>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {emailStatus && (
              <div className={`p-3 rounded-lg text-xs font-medium text-center border ${
                emailStatus.type === 'success' 
                  ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {emailStatus.message}
              </div>
            )}

            <div className="space-y-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  if (emailStatus) setEmailStatus(null);
                }}
                disabled={isEmailPending}
                placeholder="your.new@email.com"
                className="w-full px-4 py-2.5 rounded-lg bg-[#16161A] text-pure-white placeholder-muted-slate/50 border border-muted-slate/20 focus:border-hyper-blue focus:ring-1 focus:ring-hyper-blue outline-none transition-all duration-200 text-sm"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isEmailPending || newEmail.trim().toLowerCase() === initialProfile.email.toLowerCase()}
                className="px-5 py-2 rounded-lg bg-hyper-blue hover:bg-hyper-blue/90 disabled:opacity-40 text-pure-white text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer"
              >
                {isEmailPending ? 'Sending...' : 'Update Email'}
              </button>
            </div>
          </form>
        </div>

        {/* Form C: Change Password */}
        <div className="bg-[#16161A]/60 rounded-2xl border border-muted-slate/15 p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-pure-white">Change Password</h3>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {passwordStatus && (
              <div className={`p-3 rounded-lg text-xs font-medium text-center border ${
                passwordStatus.type === 'success' 
                  ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {passwordStatus.message}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-slate uppercase tracking-wider">New Password</label>
                <input
                  type="password"
                  value={passwordForm.password}
                  onChange={(e) => {
                    setPasswordForm(prev => ({ ...prev, password: e.target.value }));
                    if (passwordStatus) setPasswordStatus(null);
                  }}
                  disabled={isPasswordPending}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-lg bg-[#16161A] text-pure-white placeholder-muted-slate/50 border border-muted-slate/20 focus:border-hyper-blue focus:ring-1 focus:ring-hyper-blue outline-none transition-all duration-200 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-slate uppercase tracking-wider">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => {
                    setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }));
                    if (passwordStatus) setPasswordStatus(null);
                  }}
                  disabled={isPasswordPending}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-lg bg-[#16161A] text-pure-white placeholder-muted-slate/50 border border-muted-slate/20 focus:border-hyper-blue focus:ring-1 focus:ring-hyper-blue outline-none transition-all duration-200 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPasswordPending || !passwordForm.password || !passwordForm.confirmPassword}
                className="px-5 py-2 rounded-lg bg-hyper-blue hover:bg-hyper-blue/90 disabled:opacity-40 text-pure-white text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer"
              >
                {isPasswordPending ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Danger Zone Section */}
        <div className="bg-red-500/5 rounded-2xl border border-red-500/20 p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-red-400">Danger Zone</h3>
              <p className="text-xs text-muted-slate mt-1">
                Deleting your account is a permanent, irreversible action.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-5 py-2.5 bg-transparent border border-red-500/40 hover:bg-red-500/10 text-red-400 rounded-lg text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer flex-shrink-0"
            >
              Delete Account
            </button>
          </div>
        </div>

      </div>

      {/* Account Deletion Confirmation Overlay Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#16161A] rounded-2xl border border-red-500/30 p-6 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/35 text-red-500 rounded-full flex items-center justify-center mx-auto text-xl">
                ⚠️
              </div>
              <h3 className="text-lg font-bold text-pure-white">Confirm Account Deletion</h3>
              <p className="text-xs text-muted-slate px-2 leading-relaxed">
                This will completely delete your credentials. This action is irreversible.
              </p>
            </div>

            {deleteError && (
              <div className="bg-red-500/10 border border-red-500/35 rounded-lg p-3 text-xs text-red-400 text-center font-medium">
                {deleteError}
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-[10px] font-bold text-muted-slate uppercase tracking-wider text-center">
                Enter Your Password to Confirm Identity
              </label>
              <input
                type="password"
                value={deleteConfirmationPassword}
                onChange={(e) => setDeleteConfirmationPassword(e.target.value)}
                disabled={isDeletePending}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg bg-[#16161A] text-pure-white placeholder-muted-slate/50 border border-muted-slate/20 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all duration-200 text-sm text-center font-semibold"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmationPassword('');
                  setDeleteError(null);
                }}
                disabled={isDeletePending}
                className="flex-1 py-2.5 rounded-lg bg-transparent border border-muted-slate/20 hover:bg-muted-slate/5 text-pure-white text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeletePending || !deleteConfirmationPassword}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 text-pure-white text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer"
              >
                {isDeletePending ? 'Deleting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
