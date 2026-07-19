'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';
import type { Profile } from '../../types/supabase';

// SVG Icons
const HomeIcon = ({ active }: { active: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill={active ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5 flex-shrink-0 transition-colors"
  >
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const TrendingIcon = ({ active }: { active: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5 flex-shrink-0 transition-colors"
  >
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

const LatestIcon = ({ active }: { active: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5 flex-shrink-0 transition-colors"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 15 15" />
  </svg>
);

const SearchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5 flex-shrink-0"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const ProfileIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5 flex-shrink-0"
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const LoginIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5 flex-shrink-0"
  >
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" x2="3" y1="12" y2="12" />
  </svg>
);

const RegisterIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5 flex-shrink-0"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" x2="19" y1="8" y2="14" />
    <line x1="22" x2="16" y1="11" y2="11" />
  </svg>
);

const SettingsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-4 h-4 flex-shrink-0"
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const LogoutIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-4 h-4 flex-shrink-0"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

const InstallIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5 flex-shrink-0"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

interface SidebarProps {
  initialUser?: any;
  initialProfile?: Profile | null;
}

export default function Sidebar({ initialUser = null, initialProfile = null }: SidebarProps) {
  const [user, setUser] = useState<any>(initialUser);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(!initialUser);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  
  // Install App PWA States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosTooltip, setShowIosTooltip] = useState(false);
  
  const supabase = createClient();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const urlSearch = searchParams.get('search') || '';

  // Sync search query state with URL changes (e.g. if cleared from outer navigation)
  useEffect(() => {
    setSearchQuery(urlSearch);
  }, [urlSearch]);

  // Debounce URL search param updates to enable smooth "as-you-type" reactive search
  useEffect(() => {
    if (searchQuery === urlSearch) return;

    const delayDebounce = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (searchQuery.trim()) {
        params.set('search', searchQuery);
        params.set('category', 'all');
      } else {
        params.delete('search');
        if (params.get('category') === 'all') {
          params.delete('category');
        }
      }
      router.push(`${window.location.pathname}?${params.toString()}`);
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, urlSearch, router]);

  // 1. Session Auth Fetching & Listener
  useEffect(() => {
    async function getSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setProfile(profileData);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error('Error fetching session:', err);
      } finally {
        setLoading(false);
      }
    }

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            setProfile(profileData);
          } catch (err) {
            console.error('Error fetching profile on auth change:', err);
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // 2. Countdown clock to every 00 of an hour (e.g. 4:00, 5:00)
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0); // Next top of the hour
      
      const diffMs = nextHour.getTime() - now.getTime();
      const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      const formattedMin = String(minutes).padStart(2, '0');
      const formattedSec = String(seconds).padStart(2, '0');
      
      return `${formattedMin}:${formattedSec}`;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 3. PWA Install App Logic & Event Listeners
  useEffect(() => {
    // Hide button if already running in standalone display mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      return;
    }

    // Safety checks: must be mobile touch device, explicitly exclude Chromebooks
    const ua = navigator.userAgent;
    const isChromebook = ua.includes('CrOS');
    const isTouchDevice = 
      ('ontouchstart' in window) || 
      (navigator.maxTouchPoints > 0) || 
      window.matchMedia('(pointer: coarse)').matches;

    if (!isTouchDevice || isChromebook) {
      return;
    }

    // Detect if iOS (iPhone/iPad/iPod)
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIos(isIosDevice);

    if (isIosDevice) {
      // iOS doesn't trigger beforeinstallprompt, show the install option immediately
      setShowInstallBtn(true);
    } else {
      // Android / Chrome-based touch devices
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowInstallBtn(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosTooltip((prev) => !prev);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);

    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  const handleNav = (path: string) => {
    setSearchQuery('');
    router.push(path);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setIsProfileOpen(false);
      router.refresh();
      router.push('/');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  // Determine active states dynamically based on query params
  const defaultCategory = user ? 'for_you' : 'all';
  const currentCategory = searchParams.get('category') || defaultCategory;

  const hasSearch = searchQuery.trim() !== '';

  const isHomeActive = !hasSearch && pathname === '/' && (user ? currentCategory === 'for_you' : currentCategory !== 'trending');
  const isTrendingActive = !hasSearch && pathname === '/' && (user ? currentCategory !== 'for_you' : currentCategory === 'trending');
  const isLatestActive = !hasSearch && pathname === '/latest';
  const isProfileActive = pathname === '/profile';

  return (
    <aside className="flex w-16 md:w-64 h-screen flex-col justify-between p-2 md:p-3 pb-8 md:pb-6 bg-pitch-charcoal border-r border-muted-slate/10 text-pure-white transition-all duration-300 z-50 flex-shrink-0 sticky top-0 font-montserrat">
      
      {/* Top Group: Brand Header and Navigation Links */}
      <div className="flex flex-col gap-2 w-full">
        {/* Brand Header */}
        <div className="flex flex-col md:flex-row items-center gap-2 px-1 py-2 mb-6 select-none">
          <img
            src="/icon.svg"
            alt="Sixty Second News Logo"
            className="w-8 h-8 rounded-full flex-shrink-0 shadow-md shadow-hyper-blue/20"
          />
          <span className="hidden md:inline text-base font-bold tracking-tight text-pure-white leading-normal">
            Sixty Second News
          </span>
        </div>

        {/* Primary Navigation Section */}
        <nav className="flex flex-col gap-2 w-full">
          {/* Search Bar / Search Button */}
          <div className="w-full mb-1">
            {/* Desktop Search Input */}
            <div className="hidden md:block relative w-full px-1">
              <input
                type="text"
                placeholder="Search news..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1e1e24] text-pure-white placeholder-muted-slate text-xs pl-3 pr-8 py-2 rounded-lg border border-muted-slate/20 focus:outline-none focus:border-hyper-blue focus:ring-1 focus:ring-hyper-blue transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-slate hover:text-pure-white transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {/* Mobile Search Icon Button */}
            <button
              onClick={() => setIsMobileSearchOpen(true)}
              className="block md:hidden w-full flex items-center justify-center p-2.5 rounded-lg text-muted-slate hover:text-pure-white hover:bg-pure-white/5 transition-all"
              title="Search"
            >
              <SearchIcon />
            </button>
          </div>

          {/* Home/Feed Link */}
          <button
            onClick={() => handleNav('/')}
            className={`w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-2 md:px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
              isHomeActive
                ? 'text-hyper-blue bg-hyper-blue/10'
                : 'text-muted-slate hover:text-pure-white hover:bg-pure-white/5'
            }`}
          >
            <HomeIcon active={isHomeActive} />
            <span className="hidden md:inline">
              {user ? 'For You' : 'Home'}
            </span>
          </button>

          {/* Trending Link (Logged in users only) */}
          {user && (
            <button
              onClick={() => handleNav('/?category=trending')}
              className={`w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-2 md:px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
                isTrendingActive
                  ? 'text-hyper-blue bg-hyper-blue/10'
                  : 'text-muted-slate hover:text-pure-white hover:bg-pure-white/5'
              }`}
            >
              <TrendingIcon active={isTrendingActive} />
              <span className="hidden md:inline">Trending</span>
            </button>
          )}

          {/* Latest Link */}
          <button
            onClick={() => handleNav('/latest')}
            className={`w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-2 md:px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
              isLatestActive
                ? 'text-hyper-blue bg-hyper-blue/10'
                : 'text-muted-slate hover:text-pure-white hover:bg-pure-white/5'
            }`}
          >
            <LatestIcon active={isLatestActive} />
            <span className="hidden md:inline">Latest</span>
          </button>

          {/* Profile Link (Logged in users only) */}
          {user && (
            <button
              onClick={() => {
                setIsProfileOpen(!isProfileOpen);
              }}
              className={`w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-2 md:px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
                isProfileActive
                  ? 'text-hyper-blue bg-hyper-blue/10'
                  : 'text-muted-slate hover:text-pure-white hover:bg-pure-white/5'
              }`}
            >
              {profile?.username ? (
                <div className={`w-5 h-5 rounded-full bg-hyper-blue flex items-center justify-center text-pure-white text-[10px] font-bold flex-shrink-0 uppercase border ${isProfileActive ? 'border-pure-white' : 'border-transparent'}`}>
                  {profile.username.charAt(0)}
                </div>
              ) : (
                <div className={`w-5 h-5 rounded-full bg-hyper-blue flex items-center justify-center text-pure-white text-[10px] font-bold flex-shrink-0 uppercase border ${isProfileActive ? 'border-pure-white' : 'border-transparent'}`}>
                  {user.email?.charAt(0) || 'U'}
                </div>
              )}
              <span className="hidden md:inline">Profile</span>
            </button>
          )}

          {/* Profile Dropdown Options */}
          {user && isProfileOpen && (
            <div className="flex flex-col gap-1 w-full pl-0 md:pl-4 transition-all duration-200">
              {/* Settings Option */}
              <button
                onClick={() => {
                  handleNav('/profile');
                  setIsProfileOpen(false);
                }}
                className="w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-2 md:px-3 py-2 rounded-lg text-muted-slate hover:text-pure-white hover:bg-pure-white/5 transition-all text-xs font-semibold"
                title="Settings"
              >
                <SettingsIcon />
                <span className="hidden md:inline">Settings</span>
              </button>
              {/* Log Out Option */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-2 md:px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-xs font-semibold cursor-pointer"
                title="Log Out"
              >
                <LogoutIcon />
                <span className="hidden md:inline">Log Out</span>
              </button>
            </div>
          )}

          {/* Authentication Section (Non-Logged-In Users Only) */}
          {!loading && !user && (
            <div className="flex flex-col gap-2 w-full mt-4 border-t border-muted-slate/10 pt-4">
              {/* Desktop CTAs */}
              <div className="hidden md:flex flex-col gap-2 w-full">
                <button
                  onClick={() => handleNav('/login')}
                  className="w-full text-center py-2 border border-hyper-blue text-hyper-blue hover:bg-hyper-blue/50 hover:text-pure-white rounded-lg font-semibold transition-all text-xs"
                >
                  Log in
                </button>
                <button
                  onClick={() => handleNav('/signup')}
                  className="w-full text-center py-2 bg-hyper-blue text-pure-white hover:bg-hyper-blue/90 rounded-lg font-semibold transition-all text-xs"
                >
                  Register
                </button>
              </div>

              {/* Mobile Collapsed Authentication Icons */}
              <div className="flex md:hidden flex-col gap-2 items-center w-full">
                <button
                  onClick={() => handleNav('/login')}
                  className="w-10 h-10 flex items-center justify-center border border-muted-slate/20 text-muted-slate hover:text-pure-white hover:border-pure-white rounded-lg transition-all"
                  title="Log in"
                >
                  <LoginIcon />
                </button>
                <button
                  onClick={() => handleNav('/signup')}
                  className="w-10 h-10 flex items-center justify-center bg-hyper-blue/10 border border-hyper-blue/30 text-hyper-blue hover:bg-hyper-blue hover:text-pure-white rounded-lg transition-all"
                  title="Register"
                >
                  <RegisterIcon />
                </button>
              </div>
            </div>
          )}
        </nav>
      </div>

      {/* Bottom Group: Install App Button and Footer Info */}
      <div className="flex flex-col gap-3 w-full">
        {/* Client-side 'Install App' trigger button */}
        {showInstallBtn && (
          <div className="md:hidden relative w-full border-t border-muted-slate/10 pt-2 flex flex-col items-center animate-fadeIn">
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-3 px-2 py-2.5 rounded-lg text-muted-slate hover:text-pure-white hover:bg-pure-white/5 transition-all text-sm font-medium cursor-pointer"
              title="Install App"
            >
              <InstallIcon />
            </button>
            
            {showIosTooltip && (
              <div className="fixed bottom-24 left-4 z-[9999] w-[calc(100vw-32px)] max-w-[280px] bg-[#16161A] border border-hyper-blue p-3.5 rounded-xl shadow-2xl text-left animate-fadeIn">
                <p className="text-xs font-semibold text-pure-white leading-relaxed">
                  To install: tap the browser's <span className="text-hyper-blue font-bold">Share</span> icon then select <span className="text-hyper-blue font-bold">Add to Home Screen</span>.
                </p>
                {/* Arrow caret pointing down towards browser navigation bar */}
                <div className="absolute top-full left-8 -translate-x-1/2 border-x-6 border-x-transparent border-t-6 border-t-hyper-blue" />
              </div>
            )}
          </div>
        )}

        {/* Footer (Countdown & Logged in Indicator) */}
        <div className="hidden md:flex border-t border-muted-slate/10 pt-3 flex-col gap-3 select-none">
          {/* Countdown Widget */}
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-[9px] uppercase tracking-wider text-muted-slate font-bold">
              Next Refresh
            </span>
            <span className="text-xs md:text-sm font-extrabold font-mono text-hyper-blue bg-hyper-blue/5 border border-hyper-blue/10 px-2 py-1 rounded-md">
              {timeLeft || '00:00'}
            </span>
          </div>
          
          {/* Logged in Indicator */}
          {user && (
            <div className="text-[10px] text-muted-slate border-t border-muted-slate/5 pt-2">
              Signed in as <span className="text-pure-white block truncate">@{profile?.username || user.email?.split('@')[0]}</span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Overlay Modal */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 bg-[#16161A]/95 backdrop-blur-md z-[9999] flex flex-col p-4 md:hidden font-montserrat animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-bold tracking-wider text-pure-white uppercase">Search News</span>
            <button
              onClick={() => setIsMobileSearchOpen(false)}
              className="p-1 rounded-full bg-[#1e1e24] text-muted-slate hover:text-pure-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Input Box */}
          <div className="relative w-full mb-6">
            <input
              type="text"
              placeholder="Search news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e1e24] text-pure-white placeholder-muted-slate text-sm pl-4 pr-10 py-3 rounded-xl border border-muted-slate/20 focus:outline-none focus:border-hyper-blue focus:ring-1 focus:ring-hyper-blue transition-all"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-slate hover:text-pure-white transition-colors cursor-pointer"
                title="Clear search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Prompt / Instructions */}
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-slate p-4">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-xs font-semibold text-pure-white/80">Search any news headline...</p>            
            <button
              onClick={() => setIsMobileSearchOpen(false)}
              className="mt-6 px-6 py-2 bg-hyper-blue text-pure-white font-bold rounded-lg text-xs tracking-wider uppercase transition-transform active:scale-95 cursor-pointer"
            >
              View Results
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
