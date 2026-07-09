'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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

export default function Sidebar() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();
  const pathname = usePathname();
  const router = useRouter();

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

  const handleNav = (path: string) => {
    router.push(path);
  };

  const isHomeActive = pathname === '/';
  const isProfileActive = pathname === '/profile';

  return (
    <aside className="w-16 md:w-64 h-screen bg-pitch-charcoal border-r border-muted-slate/10 text-pure-white flex flex-col p-3 md:p-4 transition-all duration-300 z-50 flex-shrink-0 sticky top-0">
      {/* Brand Header */}
      <div className="flex flex-col md:flex-row items-center gap-2 px-1 py-2 mb-6 select-none">
        <div className="w-8 h-8 rounded-full bg-hyper-blue flex items-center justify-center text-pure-white font-extrabold text-sm flex-shrink-0 shadow-md shadow-hyper-blue/20">
          ⚡
        </div>
        <span className="text-[10px] md:text-base font-bold font-tiktok-sans tracking-tight text-pure-white text-center md:text-left leading-tight md:leading-normal">
          Sixty Second News
        </span>
      </div>

      {/* Primary Navigation Section */}
      <nav className="flex flex-col gap-2 w-full">
        {/* Search Bar / Search Button (Moved to top of Home) */}
        <div className="w-full mb-1">
          {/* Desktop Search Input */}
          <div className="hidden md:block relative w-full px-1">
            <input
              type="text"
              placeholder="Search news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e1e24] text-pure-white placeholder-muted-slate text-xs px-3 py-2 rounded-lg border border-muted-slate/20 focus:outline-none focus:border-hyper-blue focus:ring-1 focus:ring-hyper-blue font-tiktok-sans transition-all"
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
          className={`w-full flex items-center justify-center md:justify-start gap-3 px-3 py-2.5 rounded-lg transition-all font-tiktok-sans text-sm font-medium ${
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

        {/* Profile Link */}
        <button
          onClick={() => handleNav(user ? '/profile' : '/login')}
          className={`w-full flex items-center justify-center md:justify-start gap-3 px-3 py-2.5 rounded-lg transition-all font-tiktok-sans text-sm font-medium ${
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

        {/* Authentication Section (Non-Logged-In Users Only) - Moved directly under Profile button */}
        {!loading && !user && (
          <div className="flex flex-col gap-2 w-full mt-4 border-t border-muted-slate/10 pt-4">
            {/* Desktop Authentication CTAs */}
            <div className="hidden md:flex flex-col gap-2 w-full">
              <button
                onClick={() => handleNav('/login')}
                className="w-full text-center py-2 border border-hyper-blue text-hyper-blue hover:bg-hyper-blue/50 hover:text-pure-white rounded-lg font-semibold transition-all font-tiktok-sans text-xs"
              >
                Log in
              </button>
              <button
                onClick={() => handleNav('/signup')}
                className="w-full text-center py-2 bg-hyper-blue text-pure-white hover:bg-hyper-blue/90 rounded-lg font-semibold transition-all font-tiktok-sans text-xs"
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

      {/* Logged in Indicator label pushed to bottom for logged in users */}
      {user && (
        <div className="hidden md:block text-[10px] text-muted-slate text-center md:text-left mt-auto border-t border-muted-slate/10 pt-4">
          Signed in as <span className="text-pure-white block truncate">{profile?.username || user.email}</span>
        </div>
      )}
    </aside>
  );
}
