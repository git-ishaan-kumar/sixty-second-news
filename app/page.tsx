import React, { Suspense } from 'react';
import CategoryBar from '../components/layout/CategoryBar';
import { createClient } from '../utils/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  let initialUser = null;
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    initialUser = session?.user ?? null;
  } catch (err) {
    console.error('Error fetching session in Home:', err);
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Horizontal Category Pill Bar */}
      <Suspense fallback={<div className="w-full h-[57px] bg-[#16161a] border-b border-muted-slate/10" />}>
        <CategoryBar initialUser={initialUser} />
      </Suspense>
      
      {/* Feed Container Placeholder (Implemented in Phase 6) */}
      <div className="flex-1 flex flex-col items-center justify-center text-muted-slate select-none p-4">
        <div className="text-center font-tiktok-sans">
          <div className="text-4xl mb-2">📰</div>
          <p className="text-sm font-medium text-pure-white/80">Feed Engine Placeholder</p>
          <p className="text-xs text-muted-slate mt-1">Ready for 3D card layout scroll mechanics.</p>
        </div>
      </div>
    </div>
  );
}
