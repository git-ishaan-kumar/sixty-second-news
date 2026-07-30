import type { Metadata } from "next";
import { TikTok_Sans, Montserrat } from "next/font/google";
import { Suspense } from "react";
import Sidebar from "../components/layout/Sidebar";
import "./globals.css";

const tiktokSans = TikTok_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-tiktok-sans",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: 'Sixty Second News',
  description: 'Get news in 60 seconds or less',
  icons: {
    icon: '/icon.svg',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '60s News',
  },
};

import { createClient, createAdminClient } from "../utils/supabase/server";

import { InteractionProvider } from "../components/feed/InteractionContext";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  
  let initialUser = null;
  let initialProfile = null;
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    initialUser = session?.user ?? null;
    
    if (initialUser) {
      let { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', initialUser.id)
        .maybeSingle();
      
      if (!profileData) {
        // Create user profile row dynamically using admin client if missing
        const adminSupabase = createAdminClient();
        const email = initialUser.email || '';
        const username = email.split('@')[0] || 'user';
        const { data: newProfile, error: createError } = await adminSupabase
          .from('profiles')
          .insert({
            id: initialUser.id,
            username: username,
            email: email,
            category_ratings: {},
          })
          .select()
          .maybeSingle();

        if (createError) {
          console.error('Failed to dynamically create profile in layout:', createError);
          profileData = {
            id: initialUser.id,
            username: username,
            email: email,
            category_ratings: {},
            created_at: new Date().toISOString(),
          };
        } else {
          profileData = newProfile;
        }
      }
      initialProfile = profileData;
    }
  } catch (err) {
    console.error('Error fetching session/profile in layout:', err);
  }

  return (
    <html
      lang="en"
      className={`${tiktokSans.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className={`${tiktokSans.className} min-h-full flex bg-background text-foreground`}>
        <Suspense fallback={<div className="w-16 md:w-64 h-screen bg-pitch-charcoal border-r border-muted-slate/10 flex-shrink-0" />}>
          <Sidebar initialUser={initialUser} initialProfile={initialProfile} />
        </Suspense>
        <main className="flex-1 flex flex-col min-w-0">
          <InteractionProvider>
            {children}
          </InteractionProvider>
        </main>
      </body>
    </html>
  );
}



