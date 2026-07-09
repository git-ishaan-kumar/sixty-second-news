import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
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
      className={`${montserrat.variable} h-full antialiased`}
    >
      <body className={`${montserrat.className} min-h-full flex flex-col bg-background text-foreground`}>
        {children}
      </body>
    </html>
  );
}

