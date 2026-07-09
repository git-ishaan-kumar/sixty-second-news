import type { Metadata } from "next";
import { TikTok_Sans } from "next/font/google";
import Sidebar from "../components/layout/Sidebar";
import "./globals.css";

const tiktokSans = TikTok_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-tiktok-sans",
});

export const metadata: Metadata = {
  title: "Sixty Second News | Fast, Visual Breaking News Hooks",
  description: "Aggregating global breaking news, rewritten into engaging 60-second hooks with flippable cards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${tiktokSans.variable} h-full antialiased`}
    >
      <body className={`${tiktokSans.className} min-h-full flex bg-background text-foreground`}>
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0">
          {children}
        </main>
      </body>
    </html>
  );
}



