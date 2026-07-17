'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginAction } from './actions';

interface FormErrors {
  emailOrUsername?: string;
  password?: string;
  global?: string;
}

export default function LoginPage() {
  const router = useRouter();

  // Form values state
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');

  // Password visibility toggle state
  const [showPassword, setShowPassword] = useState(false);

  // Validation errors state
  const [errors, setErrors] = useState<FormErrors>({});
  const [isPending, setIsPending] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Form validation checks before submitting (immediate check before hitting the server)
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // 1. Email or Username Check
    if (!emailOrUsername.trim()) {
      newErrors.emailOrUsername = 'Email or Username is required.';
      isValid = false;
    }

    // 2. Password Check
    if (!password) {
      newErrors.password = 'Password is required.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setIsPending(true);

    try {
      const formData = new FormData();
      formData.append('emailOrUsername', emailOrUsername);
      formData.append('password', password);

      const result = await loginAction(formData);

      if (!result.success) {
        setErrors({ global: result.error || 'Authentication failed. Please check your credentials.' });
      } else {
        setLoginSuccess(true);
        // Force a full browser reload using window.location to bypass Client Router Cache and sync the layout
        setTimeout(() => {
          window.location.href = result.redirect || '/';
        }, 1500);
      }
    } catch (err) {
      setErrors({ global: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-12 bg-background min-h-screen">
      <div className="w-full max-w-md bg-[#16161A]/85 backdrop-blur-md rounded-2xl border border-muted-slate/15 p-8 shadow-2xl transition-all duration-300">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-pure-white tracking-wide">Log In</h2>
        </div>

        {loginSuccess ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-hyper-blue/10 border border-hyper-blue text-hyper-blue rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">
              ✓
            </div>
            <h3 className="text-lg font-semibold text-pure-white">Successfully Logged In!</h3>
            <p className="text-sm text-muted-slate">Loading your news feed...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            
            {/* Global Error Banner */}
            {errors.global && (
              <div className="bg-red-500/10 border border-red-500/35 rounded-lg p-3 text-sm text-red-400 text-center font-medium animate-fadeIn">
                {errors.global}
              </div>
            )}

            {/* Email or Username Field */}
            <div className="space-y-2">
              <label htmlFor="emailOrUsername" className="block text-xs font-semibold text-pure-white tracking-wider uppercase">
                Email or Username
              </label>
              <input
                id="emailOrUsername"
                name="emailOrUsername"
                type="text"
                value={emailOrUsername}
                onChange={(e) => {
                  setEmailOrUsername(e.target.value);
                  if (errors.emailOrUsername) setErrors((prev) => ({ ...prev, emailOrUsername: '' }));
                }}
                disabled={isPending}
                placeholder="johndoe or john.doe@email.com"
                className={`w-full px-4 py-3 rounded-lg bg-[#16161A] text-pure-white placeholder-muted-slate/50 border ${
                  errors.emailOrUsername ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-muted-slate/20 focus:border-hyper-blue focus:ring-1 focus:ring-hyper-blue'
                } outline-none transition-all duration-200 text-sm`}
              />
              {errors.emailOrUsername && (
                <p className="text-xs text-red-400 font-medium tracking-wide mt-1 animate-fadeIn">
                  {errors.emailOrUsername}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="block text-xs font-semibold text-pure-white tracking-wider uppercase">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  disabled={isPending}
                  placeholder="••••••••"
                  className={`w-full pl-4 pr-12 py-3 rounded-lg bg-[#16161A] text-pure-white placeholder-muted-slate/50 border ${
                    errors.password ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-muted-slate/20 focus:border-hyper-blue focus:ring-1 focus:ring-hyper-blue'
                  } outline-none transition-all duration-200 text-sm`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-slate hover:text-pure-white transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.815 7.815 3 3m-3-3-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 font-medium tracking-wide mt-1 animate-fadeIn">
                  {errors.password}
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
                'Log In'
              )}
            </button>

            {/* Anchor Links */}
            <div className="flex flex-col gap-2 items-center text-center pt-2">
              <span className="text-xs text-muted-slate">
                Don't have an account?{' '}
                <Link href="/signup" className="text-hyper-blue hover:underline font-medium transition-all">
                  Sign Up
                </Link>
              </span>
              <span className="text-xs text-muted-slate">
                <Link href="/forgot-password" className="text-hyper-blue/85 hover:text-hyper-blue hover:underline font-medium transition-all">
                  Forgot Password?
                </Link>
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
