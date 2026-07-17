import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import ProfileClientShell from '@/components/profile/ProfileClientShell';

export const metadata = {
  title: 'Sixty Second News',
  description: 'Manage your Sixty Second News profile details and security credentials.',
};

export default async function ProfilePage() {
  const supabase = await createClient();
  
  // Fetch session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect('/login?redirectedFrom=/profile');
  }

  // Fetch user profile from the database
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user profile:', error.message, `(Code: ${error.code})`);
  }

  // Prepopulate standard profile information fallback if DB query is slow or empty
  const userProfile = {
    id: session.user.id,
    email: session.user.email || '',
    username: profile?.username || session.user.user_metadata?.username || 'user',
    created_at: session.user.created_at,
  };

  return (
    <div className="flex-1 bg-background min-h-screen py-10 px-4 md:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="border-b border-muted-slate/15 pb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold text-pure-white tracking-wide">
            Account Management
          </h1>
        </div>

        {/* Profile client component handling updates and interactions */}
        <ProfileClientShell initialProfile={userProfile} />

      </div>
    </div>
  );
}
