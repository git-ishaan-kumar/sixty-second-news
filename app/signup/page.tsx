'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUpAction } from './actions';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: (error?: any) => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
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

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  turnstile?: string;
  global?: string;
}

export default function SignUpPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Form values state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [turnstileToken, setTurnstileToken] = useState('');
  
  // Validation errors state
  const [errors, setErrors] = useState<FormErrors>({});
  const [isPending, setIsPending] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  // Load Turnstile explicitly
  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey) {
      console.error('Turnstile site key is missing in environment variables.');
      return;
    }

    const initializeTurnstile = () => {
      if (window.turnstile && containerRef.current) {
        try {
          window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => {
              setTurnstileToken(token);
              setErrors((prev) => ({ ...prev, turnstile: '' }));
            },
            'expired-callback': () => {
              setTurnstileToken('');
            },
            'error-callback': () => {
              setTurnstileToken('');
              setErrors((prev) => ({ ...prev, turnstile: 'Security verification encountered an error.' }));
            },
          });
        } catch (err) {
          console.error('Error rendering Turnstile:', err);
        }
      }
    };

    let script = document.querySelector('script[src*="turnstile"]') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = initializeTurnstile;
      document.body.appendChild(script);
    } else {
      if (window.turnstile) {
        initializeTurnstile();
      } else {
        const interval = setInterval(() => {
          if (window.turnstile) {
            initializeTurnstile();
            clearInterval(interval);
          }
        }, 100);
        return () => clearInterval(interval);
      }
    }
  }, []);

  // Form Validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // 1. Username Validation
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      newErrors.username = 'Username is required.';
      isValid = false;
    } else if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      newErrors.username = 'Username must be between 3 and 20 characters.';
      isValid = false;
    } else {
      const usernameRegex = /^[a-zA-Z0-9_\.-]+$/;
      if (!usernameRegex.test(trimmedUsername)) {
        newErrors.username = 'Username can only contain alphanumeric characters, underscores, periods, and hyphens.';
        isValid = false;
      }
    }

    // 2. Email Validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = 'Email address is required.';
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        newErrors.email = 'Please enter a valid email address.';
        isValid = false;
      }
    }

    // 3. Password Validation
    if (!password) {
      newErrors.password = 'Password is required.';
      isValid = false;
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
      isValid = false;
    } else if (password.length > 72) {
      newErrors.password = 'Password cannot exceed 72 characters.';
      isValid = false;
    } else if (PASSWORD_BLACKLIST.includes(password.toLowerCase())) {
      newErrors.password = 'Password is too common or easy to guess.';
      isValid = false;
    } else {
      if (!/[A-Z]/.test(password)) {
        newErrors.password = 'Password must contain at least one uppercase letter.';
        isValid = false;
      }
      if (!/[a-z]/.test(password)) {
        newErrors.password = 'Password must contain at least one lowercase letter.';
        isValid = false;
      }
      if (!/[0-9]/.test(password)) {
        newErrors.password = 'Password must contain at least one number.';
        isValid = false;
      }
    }

    // 3b. Confirm Password Validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
      isValid = false;
    }

    // 4. Turnstile Verification Token Check
    if (!turnstileToken) {
      newErrors.turnstile = 'Please complete the security check.';
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
      formData.append('username', username);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('confirmPassword', confirmPassword);
      formData.append('turnstileToken', turnstileToken);

      const result = await signUpAction(formData);

      if (!result.success) {
        setErrors({ global: result.error || 'Registration failed. Please check your credentials.' });
        // Reset turnstile widget on error to allow retry
        if (window.turnstile) {
          window.turnstile.reset();
          setTurnstileToken('');
        }
      } else {
        setSignUpSuccess(true);
        // Force a full browser reload using window.location to bypass Client Router Cache and sync the layout
        setTimeout(() => {
          window.location.href = result.redirect || '/';
        }, 1500);
      }
    } catch (err) {
      setErrors({ global: 'An unexpected error occurred. Please try again.' });
      if (window.turnstile) {
        window.turnstile.reset();
        setTurnstileToken('');
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-12 bg-background min-h-screen">
      <div className="w-full max-w-md bg-[#16161A]/85 backdrop-blur-md rounded-2xl border border-muted-slate/15 p-8 shadow-2xl transition-all duration-300">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-pure-white tracking-wide">Create your account</h2>
        </div>

        {signUpSuccess ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-hyper-blue/10 border border-hyper-blue text-hyper-blue rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">
              ✓
            </div>
            <h3 className="text-lg font-semibold text-pure-white">Account Created Successfully!</h3>
            <p className="text-sm text-muted-slate">Preparing your news feed...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            
            {/* Global Error Banner */}
            {errors.global && (
              <div className="bg-red-500/10 border border-red-500/35 rounded-lg p-3 text-sm text-red-400 text-center font-medium animate-fadeIn">
                {errors.global}
              </div>
            )}

            {/* Username Field */}
            <div className="space-y-2">
              <label htmlFor="username" className="block text-xs font-semibold text-pure-white tracking-wider uppercase">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errors.username) setErrors((prev) => ({ ...prev, username: '' }));
                }}
                disabled={isPending}
                placeholder="johndoe"
                className={`w-full px-4 py-3 rounded-lg bg-[#16161A] text-pure-white placeholder-muted-slate/50 border ${
                  errors.username ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-muted-slate/20 focus:border-hyper-blue focus:ring-1 focus:ring-hyper-blue'
                } outline-none transition-all duration-200 text-sm`}
              />
              {errors.username && (
                <p className="text-xs text-red-400 font-medium tracking-wide mt-1 animate-fadeIn">
                  {errors.username}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs font-semibold text-pure-white tracking-wider uppercase">
                Email Address
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

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-xs font-semibold text-pure-white tracking-wider uppercase">
                Password
              </label>
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

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-pure-white tracking-wider uppercase">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }}
                  disabled={isPending}
                  placeholder="••••••••"
                  className={`w-full pl-4 pr-12 py-3 rounded-lg bg-[#16161A] text-pure-white placeholder-muted-slate/50 border ${
                    errors.confirmPassword ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-muted-slate/20 focus:border-hyper-blue focus:ring-1 focus:ring-hyper-blue'
                  } outline-none transition-all duration-200 text-sm`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-slate hover:text-pure-white transition-colors cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
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
              {errors.confirmPassword && (
                <p className="text-xs text-red-400 font-medium tracking-wide mt-1 animate-fadeIn">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Turnstile Captcha Container */}
            <div className="space-y-2 flex flex-col items-center">
              <span className="self-start text-xs font-semibold text-pure-white tracking-wider uppercase">
                Security Check
              </span>
              <div 
                ref={containerRef} 
                className="w-full flex justify-center bg-[#16161A] p-2 rounded-lg border border-muted-slate/10 min-h-[65px]"
              />
              {errors.turnstile && (
                <p className="self-start text-xs text-red-400 font-medium tracking-wide mt-1 animate-fadeIn">
                  {errors.turnstile}
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
                'Sign Up'
              )}
            </button>

            {/* Anchor Links */}
            <div className="text-center pt-2">
              <span className="text-xs text-muted-slate">
                Already have an account?{' '}
                <Link href="/login" className="text-hyper-blue hover:underline font-medium transition-all">
                  Log In
                </Link>
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
