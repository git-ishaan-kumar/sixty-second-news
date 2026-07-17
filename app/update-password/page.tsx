'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updatePasswordAction } from './actions';

interface FormErrors {
  password?: string;
  confirmPassword?: string;
  global?: string;
}

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    if (!password) {
      newErrors.password = 'New password is required.';
      isValid = false;
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
      isValid = false;
    } else if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number.';
      isValid = false;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password.';
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage(null);

    if (!validateForm()) {
      return;
    }

    setIsPending(true);

    try {
      const result = await updatePasswordAction(password, confirmPassword);

      if (!result.success) {
        setErrors({ global: result.error || 'Failed to update password. Please try again.' });
      } else {
        setSuccessMessage(result.message || 'Password updated successfully.');
        setPassword('');
        setConfirmPassword('');
        // Redirect to login page after 2 seconds
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err) {
      setErrors({ global: 'An unexpected error occurred. Please try again later.' });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-12 bg-background font-montserrat min-h-screen">
      <div className="w-full max-w-md bg-[#16161A]/85 backdrop-blur-md rounded-2xl border border-muted-slate/15 p-8 shadow-2xl transition-all duration-300">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-pure-white tracking-wide">Update Password</h2>
          <p className="text-xs text-muted-slate mt-2">
            Enter your new secure password credentials.
          </p>
        </div>

        {successMessage ? (
          <div className="text-center py-6 space-y-4 animate-fadeIn">
            <div className="w-16 h-16 bg-hyper-blue/10 border border-hyper-blue text-hyper-blue rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">
              ✓
            </div>
            <h3 className="text-lg font-semibold text-pure-white">Password Updated</h3>
            <p className="text-sm text-muted-slate px-2 leading-relaxed">
              {successMessage}
            </p>
            <p className="text-xs text-muted-slate/75">
              Redirecting you to the login screen...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            
            {/* Global Error Banner */}
            {errors.global && (
              <div className="bg-red-500/10 border border-red-500/35 rounded-lg p-3 text-sm text-red-400 text-center font-medium animate-fadeIn">
                {errors.global}
              </div>
            )}

            {/* New Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-xs font-semibold text-pure-white tracking-wider uppercase">
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                }}
                disabled={isPending}
                placeholder="••••••••"
                className={`w-full px-4 py-3 rounded-lg bg-[#16161A] text-pure-white placeholder-muted-slate/50 border ${
                  errors.password ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-muted-slate/20 focus:border-hyper-blue focus:ring-1 focus:ring-hyper-blue'
                } outline-none transition-all duration-200 text-sm`}
              />
              {errors.password && (
                <p className="text-xs text-red-400 font-medium tracking-wide mt-1 animate-fadeIn leading-relaxed">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm New Password Field */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-pure-white tracking-wider uppercase">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }}
                disabled={isPending}
                placeholder="••••••••"
                className={`w-full px-4 py-3 rounded-lg bg-[#16161A] text-pure-white placeholder-muted-slate/50 border ${
                  errors.confirmPassword ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-muted-slate/20 focus:border-hyper-blue focus:ring-1 focus:ring-hyper-blue'
                } outline-none transition-all duration-200 text-sm`}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-400 font-medium tracking-wide mt-1 animate-fadeIn">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 px-4 rounded-lg bg-hyper-blue hover:bg-hyper-blue/90 active:scale-[0.98] text-pure-white text-sm font-bold tracking-wider border border-hyper-blue hover:border-hyper-blue/80 transition-all duration-200 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <div className="w-5 h-5 border-2 border-pure-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
