import type { Metadata } from "next";
import { Geist, Chakra_Petch } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/toaster";

const geist = Geist({ 
  subsets: ["latin"], 
  variable: "--font-sans" 
});

const chakra = Chakra_Petch({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["latin"],
  variable: "--font-heading"
});

export const metadata: Metadata = {
  title: "Upkeep | Tournament Companion",
  description: "Track events, decks, and tournaments for Magic the Gathering.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.variable} ${chakra.variable} font-sans antialiased bg-background text-foreground selection:bg-primary/30 selection:text-primary-foreground`}>
        <AppShell>
          {children}
        </AppShell>
        <Toaster />
      </body>
    </html>
  );
}