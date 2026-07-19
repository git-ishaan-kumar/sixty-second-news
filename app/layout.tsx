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
  title: "Sixty Second News",
  description: "Aggregating global breaking news, rewritten into engaging 60-second hooks with flippable cards.",
};

import { createClient } from "../utils/supabase/server";

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
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', initialUser.id)
        .single();
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
          {children}
        </main>
      </body>
    </html>
  );
}



