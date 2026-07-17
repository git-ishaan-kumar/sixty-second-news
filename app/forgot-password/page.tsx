'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { resetPasswordAction } from './actions';

interface FormErrors {
  email?: string;
  global?: string;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Please enter a valid email address.';
        isValid = false;
      }
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
      // Obtain window.location.origin dynamically on the client side to support PKCE flow
      const origin = window.location.origin;
      const result = await resetPasswordAction(email, origin);

      if (!result.success) {
        setErrors({ global: result.error || 'Failed to send reset link. Please try again.' });
      } else {
        setSuccessMessage(result.message || 'Password reset link sent successfully.');
        setEmail('');
      }
    } catch (err) {
      setErrors({ global: 'An unexpected error occurred. Please try again later.' });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-12 bg-background min-h-screen">
      <div className="w-full max-w-md bg-[#16161A]/85 backdrop-blur-md rounded-2xl border border-muted-slate/15 p-8 shadow-2xl transition-all duration-300">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-pure-white tracking-wide">Forgot Password</h2>
          <p className="text-xs text-muted-slate mt-2">
            Enter your email to receive a recovery link.
          </p>
        </div>

        {successMessage ? (
          <div className="text-center py-6 space-y-4 animate-fadeIn">
            <div className="w-16 h-16 bg-hyper-blue/10 border border-hyper-blue text-hyper-blue rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">
              ✓
            </div>
            <h3 className="text-lg font-semibold text-pure-white">Check Your Inbox</h3>
            <p className="text-sm text-muted-slate px-2 leading-relaxed">
              {successMessage}
            </p>
            <div className="pt-4">
              <Link href="/login" className="text-hyper-blue hover:underline text-sm font-semibold transition-all">
                Return to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            
            {/* Global Error Banner */}
            {errors.global && (
              <div className="bg-red-500/10 border border-red-500/35 rounded-lg p-3 text-sm text-red-400 text-center font-medium animate-fadeIn">
                {errors.global}
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs font-semibold text-pure-white tracking-wider uppercase">
                Enter Your Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                disabled={isPending}
                placeholder="john.doe@email.com"
                className={`w-full px-4 py-3 rounded-lg bg-[#16161A] text-pure-white placeholder-muted-slate/50 border ${
                  errors.email ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-muted-slate/20 focus:border-hyper-blue focus:ring-1 focus:ring-hyper-blue'
                } outline-none transition-all duration-200 text-sm`}
              />
              {errors.email && (
                <p className="text-xs text-red-400 font-medium tracking-wide mt-1 animate-fadeIn">
                  {errors.email}
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
                'Send Reset Link'
              )}
            </button>

            {/* Back to Login Anchor */}
            <div className="text-center pt-2">
              <Link href="/login" className="text-xs text-muted-slate hover:text-pure-white hover:underline transition-all">
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
