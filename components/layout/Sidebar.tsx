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
  
  const supabase = createClient();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

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

  const handleNav = (path: string) => {
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

  const isHomeActive = pathname === '/' && (user ? currentCategory === 'for_you' : currentCategory !== 'trending');
  const isTrendingActive = pathname === '/' && (user ? currentCategory !== 'for_you' : currentCategory === 'trending');
  const isProfileActive = pathname === '/profile';

  return (
    <aside className="w-16 md:w-64 h-screen bg-pitch-charcoal border-r border-muted-slate/10 text-pure-white flex flex-col p-3 md:p-4 transition-all duration-300 z-50 flex-shrink-0 sticky top-0 font-montserrat">
      {/* Brand Header */}
      <div className="flex flex-col md:flex-row items-center gap-2 px-1 py-2 mb-6 select-none">
        <div className="w-8 h-8 rounded-full bg-hyper-blue flex items-center justify-center text-pure-white font-extrabold text-sm flex-shrink-0 shadow-md shadow-hyper-blue/20">
          ⚡
        </div>
        <span className="text-[10px] md:text-base font-bold tracking-tight text-pure-white text-center md:text-left leading-tight md:leading-normal">
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
              className="w-full bg-[#1e1e24] text-pure-white placeholder-muted-slate text-xs px-3 py-2 rounded-lg border border-muted-slate/20 focus:outline-none focus:border-hyper-blue focus:ring-1 focus:ring-hyper-blue transition-all"
            />
          </div>
          {/* Mobile Search Icon Button */}
          <button
            onClick={() => {}}
            className="block md:hidden w-full flex items-center justify-center p-2.5 rounded-lg text-muted-slate hover:text-pure-white hover:bg-pure-white/5 transition-all"
            title="Search"
          >
            <SearchIcon />
          </button>
        </div>

        {/* Home/Feed Link */}
        <button
          onClick={() => handleNav('/')}
          className={`w-full flex items-center justify-center md:justify-start gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
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
            className={`w-full flex items-center justify-center md:justify-start gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
              isTrendingActive
                ? 'text-hyper-blue bg-hyper-blue/10'
                : 'text-muted-slate hover:text-pure-white hover:bg-pure-white/5'
            }`}
          >
            <TrendingIcon active={isTrendingActive} />
            <span className="hidden md:inline">Trending</span>
          </button>
        )}

        {/* Profile Link */}
        <button
          onClick={() => {
            if (user) {
              setIsProfileOpen(!isProfileOpen);
            } else {
              handleNav('/login');
            }
          }}
          className={`w-full flex items-center justify-center md:justify-start gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
            isProfileActive
              ? 'text-hyper-blue bg-hyper-blue/10'
              : 'text-muted-slate hover:text-pure-white hover:bg-pure-white/5'
          }`}
        >
          {user && profile?.username ? (
            <div className={`w-5 h-5 rounded-full bg-hyper-blue flex items-center justify-center text-pure-white text-[10px] font-bold flex-shrink-0 uppercase border ${isProfileActive ? 'border-pure-white' : 'border-transparent'}`}>
              {profile.username.charAt(0)}
            </div>
          ) : user ? (
            <div className={`w-5 h-5 rounded-full bg-hyper-blue flex items-center justify-center text-pure-white text-[10px] font-bold flex-shrink-0 uppercase border ${isProfileActive ? 'border-pure-white' : 'border-transparent'}`}>
              {user.email?.charAt(0) || 'U'}
            </div>
          ) : (
            <ProfileIcon />
          )}
          <span className="hidden md:inline">Profile</span>
        </button>

        {/* Profile Dropdown Options */}
        {user && isProfileOpen && (
          <div className="flex flex-col gap-1 w-full pl-0 md:pl-4 transition-all duration-200">
            {/* Settings Option */}
            <button
              onClick={() => {
                handleNav('/profile');
                setIsProfileOpen(false);
              }}
              className="w-full flex items-center justify-center md:justify-start gap-3 px-3 py-2 rounded-lg text-muted-slate hover:text-pure-white hover:bg-pure-white/5 transition-all text-xs font-semibold"
              title="Settings"
            >
              <SettingsIcon />
              <span className="hidden md:inline">Settings</span>
            </button>
            {/* Log Out Option */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center md:justify-start gap-3 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-xs font-semibold cursor-pointer"
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

      {/* Footer (Countdown & Logged in Indicator) */}
      <div className="mt-auto border-t border-muted-slate/10 pt-4 flex flex-col gap-3 select-none">
        {/* Countdown Widget */}
        <div className="flex flex-col items-center md:items-start gap-0.5">
          <span className="hidden md:block text-[9px] uppercase tracking-wider text-muted-slate font-bold">
            Next Refresh
          </span>
          <span className="text-xs md:text-sm font-extrabold font-mono text-hyper-blue bg-hyper-blue/5 border border-hyper-blue/10 px-2 py-1 rounded-md">
            {timeLeft || '00:00'}
          </span>
        </div>
        
        {/* Logged in Indicator */}
        {user && (
          <div className="hidden md:block text-[10px] text-muted-slate border-t border-muted-slate/5 pt-2">
            Signed in as <span className="text-pure-white block truncate">@{profile?.username || user.email?.split('@')[0]}</span>
          </div>
        )}
      </div>
    </aside>
  );
}
